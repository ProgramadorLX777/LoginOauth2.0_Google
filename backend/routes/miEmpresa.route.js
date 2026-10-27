const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');
const { normalizarRut } = require('../utils/rut');

router.use(requireRol('estudiante'));

const REGEX_FONO = /^[0-9+\s-]{8,15}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mientras la práctica esté en estas etapas, el alumno puede corregir sus datos
const ETAPAS_EDITABLES = ['buscando_centro', 'centro_informado', 'documentacion_inicial'];

const limpiar = v => (typeof v === 'string' ? v.trim() : '');

// Buscar una empresa del banco de centros de práctica por su RUT
router.get('/empresa/buscar', async (req, res) => {
  const rut = normalizarRut(req.query.rut);
  if (!rut) return res.status(400).json({ error: 'RUT inválido. Revisa el número y el dígito verificador.' });

  try {
    const [rows] = await pool.query(
      `SELECT id_centro_practica, rut_centro_practica AS rut_empresa, razon_social,
              nombre_fantasia, giro, direccion, numero_direccion, comuna, region,
              telefono, correo, sitio_web
         FROM centros_practica
        WHERE rut_centro_practica = ?
        LIMIT 1`,
      [rut]
    );
    if (!rows[0]) return res.json({ existe: false, rut });
    res.json({ existe: true, empresa: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar la empresa' });
  }
});

// Mi práctica vigente (o null si todavía no la registra)
router.get('/mi-practica', async (req, res) => {
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  try {
    const [rows] = await pool.query(
      `SELECT p.id_practica, p.sucursal, p.departamento, p.jefe_directo,
              p.cargo_jefe_directo, p.etapa,
              c.id_centro_practica, c.rut_centro_practica AS rut_empresa, c.razon_social,
              c.nombre_fantasia, c.giro, c.direccion, c.numero_direccion, c.comuna,
              c.region, c.telefono AS telefono_empresa, c.correo AS correo_empresa,
              c.sitio_web,
              s.rut_supervisor, s.nombre_completo AS supervisor_nombre,
              s.cargo AS supervisor_cargo, s.telefono AS supervisor_telefono,
              s.correo AS supervisor_correo
         FROM practicas p
         JOIN centros_practica c ON c.id_centro_practica = p.id_centro_practica
         JOIN supervisores_practica s ON s.id_supervisor = p.id_supervisor
        WHERE p.rut_estudiante = ? AND p.estado = 'vigente'
        ORDER BY p.id_practica DESC
        LIMIT 1`,
      [rut]
    );
    const practica = rows[0] || null;
    res.json({
      practica,
      editable: practica ? ETAPAS_EDITABLES.includes(practica.etapa) : true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tu práctica' });
  }
});

// Registrar o corregir mi práctica
router.put('/mi-practica', async (req, res) => {
  const rutEstudiante = req.session.user.rut_estudiante;
  if (!rutEstudiante) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  const b = req.body || {};
  const s = b.supervisor || {};

  const rutEmpresa = normalizarRut(b.rut_empresa);
  const rutSupervisor = normalizarRut(s.rut);
  const sucursal = limpiar(b.sucursal);
  const departamento = limpiar(b.departamento);
  const jefeDirecto = limpiar(b.jefe_directo);
  const cargoJefe = limpiar(b.cargo_jefe_directo);
  const supNombre = limpiar(s.nombre_completo);
  const supCargo = limpiar(s.cargo);
  const supTelefono = limpiar(s.telefono);
  const supCorreo = limpiar(s.correo);

  if (!rutEmpresa) return res.status(400).json({ error: 'RUT de la empresa inválido' });
  if (!rutSupervisor) return res.status(400).json({ error: 'RUT del supervisor inválido' });
  if (sucursal.length > 150) return res.status(400).json({ error: 'La sucursal es demasiado larga' });
  if (!departamento || departamento.length > 100) return res.status(400).json({ error: 'Indica el departamento donde harás la práctica' });
  if (!jefeDirecto || jefeDirecto.length > 100) return res.status(400).json({ error: 'Indica el nombre del jefe directo' });
  if (!cargoJefe || cargoJefe.length > 100) return res.status(400).json({ error: 'Indica el cargo del jefe directo' });
  if (!supNombre || supNombre.length > 100) return res.status(400).json({ error: 'Indica el nombre del supervisor' });
  if (!supCargo || supCargo.length > 100) return res.status(400).json({ error: 'Indica el cargo del supervisor' });
  if (!REGEX_FONO.test(supTelefono)) return res.status(400).json({ error: 'Teléfono del supervisor inválido' });
  if (!REGEX_CORREO.test(supCorreo) || supCorreo.length > 100) return res.status(400).json({ error: 'Correo del supervisor inválido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Por ahora la empresa debe existir en el banco; el alumno no puede modificar sus datos
    const [centros] = await conn.query(
      'SELECT id_centro_practica FROM centros_practica WHERE rut_centro_practica = ?',
      [rutEmpresa]
    );
    if (!centros[0]) {
      await conn.rollback();
      return res.status(404).json({ error: 'La empresa no está registrada en el sistema' });
    }
    const idCentro = centros[0].id_centro_practica;

    // Supervisor de la práctica: si ya existe en esa empresa se actualiza, si no se crea
    const [sup] = await conn.query(
      `INSERT INTO supervisores_practica
         (id_centro_practica, rut_supervisor, nombre_completo, cargo, telefono, correo)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nombre_completo = VALUES(nombre_completo),
         cargo = VALUES(cargo),
         telefono = VALUES(telefono),
         correo = VALUES(correo),
         id_supervisor = LAST_INSERT_ID(id_supervisor)`,
      [idCentro, rutSupervisor, supNombre, supCargo, supTelefono, supCorreo]
    );
    const idSupervisor = sup.insertId;

    const [vigentes] = await conn.query(
      `SELECT id_practica, etapa FROM practicas
        WHERE rut_estudiante = ? AND estado = 'vigente'
        ORDER BY id_practica DESC LIMIT 1 FOR UPDATE`,
      [rutEstudiante]
    );

    if (vigentes[0]) {
      if (!ETAPAS_EDITABLES.includes(vigentes[0].etapa)) {
        await conn.rollback();
        return res.status(403).json({ error: 'Tu práctica ya avanzó de etapa. Para cambios, habla con tu profesor tutor.' });
      }
      await conn.query(
        `UPDATE practicas
            SET id_centro_practica = ?, id_supervisor = ?, sucursal = ?,
                departamento = ?, jefe_directo = ?, cargo_jefe_directo = ?
          WHERE id_practica = ?`,
        [idCentro, idSupervisor, sucursal || null, departamento, jefeDirecto, cargoJefe, vigentes[0].id_practica]
      );
    } else {
      await conn.query(
        `INSERT INTO practicas
           (rut_estudiante, id_centro_practica, id_supervisor, sucursal,
            departamento, jefe_directo, cargo_jefe_directo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [rutEstudiante, idCentro, idSupervisor, sucursal || null, departamento, jefeDirecto, cargoJefe]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al guardar tu práctica' });
  } finally {
    conn.release();
  }
});

module.exports = router;