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

// Una práctica ya validada por el colegio queda bloqueada para el alumno
function puedeEditar(practica) {
  return ETAPAS_EDITABLES.includes(practica.etapa) && practica.estado_validacion !== 'validada';
}

// Límite de búsquedas por usuario: evita recorrer el banco de empresas probando RUT
const busquedas = new Map();
function limitarBusquedas(req, res, next) {
  const clave = req.session.user.id_usuario;
  const ahora = Date.now();
  const ventana = 5 * 60 * 1000; // 5 minutos
  const recientes = (busquedas.get(clave) || []).filter(t => ahora - t < ventana);
  if (recientes.length >= 30) {
    return res.status(429).json({ error: 'Demasiadas búsquedas. Espera unos minutos e inténtalo de nuevo.' });
  }
  recientes.push(ahora);
  busquedas.set(clave, recientes);
  next();
}

// Buscar una empresa del banco de centros de práctica por su RUT.
// Solo devuelve datos de identificación: no teléfono, correo ni sitio web.
router.get('/empresa/buscar', limitarBusquedas, async (req, res) => {
  const rut = normalizarRut(req.query.rut);
  if (!rut) return res.status(400).json({ error: 'RUT inválido. Revisa el número y el dígito verificador.' });

  try {
    const [rows] = await pool.query(
      `SELECT id_centro_practica, rut_centro_practica AS rut_empresa, razon_social,
              nombre_fantasia, giro, direccion, numero_direccion, comuna, region
         FROM centros_practica
        WHERE rut_centro_practica = ? AND activo = 1
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

// Supervisores ya validados de una empresa (solo nombre y cargo, sin datos de contacto)
router.get('/empresa/:idCentro/supervisores', async (req, res) => {
  const idCentro = Number(req.params.idCentro);
  if (!Number.isInteger(idCentro)) return res.status(400).json({ error: 'Solicitud inválida' });

  try {
    const [rows] = await pool.query(
      `SELECT s.id_supervisor, s.nombre_completo, s.cargo
         FROM supervisores_practica s
         JOIN centros_practica c ON c.id_centro_practica = s.id_centro_practica
        WHERE s.id_centro_practica = ? AND s.estado = 'validado' AND c.activo = 1
        ORDER BY s.nombre_completo`,
      [idCentro]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los supervisores' });
  }
});

// Mi práctica vigente (o null si todavía no la registra)
router.get('/mi-practica', async (req, res) => {
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  try {
    const [rows] = await pool.query(
      `SELECT p.id_practica, p.sucursal, p.departamento, p.jefe_directo,
              p.cargo_jefe_directo, p.etapa, p.estado_validacion, p.observacion_validacion,
              c.id_centro_practica, c.rut_centro_practica AS rut_empresa, c.razon_social,
              c.nombre_fantasia, c.giro, c.direccion, c.numero_direccion, c.comuna,
              c.region, c.telefono AS telefono_empresa, c.correo AS correo_empresa,
              c.sitio_web,
              s.id_supervisor, s.rut_supervisor, s.nombre_completo AS supervisor_nombre,
              s.cargo AS supervisor_cargo, s.telefono AS supervisor_telefono,
              s.correo AS supervisor_correo, s.estado AS supervisor_estado
         FROM practicas p
         JOIN centros_practica c ON c.id_centro_practica = p.id_centro_practica
         JOIN supervisores_practica s ON s.id_supervisor = p.id_supervisor
        WHERE p.rut_estudiante = ? AND p.estado = 'vigente'
        ORDER BY p.id_practica DESC
        LIMIT 1`,
      [rut]
    );
    const practica = rows[0] || null;
    res.json({ practica, editable: practica ? puedeEditar(practica) : true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tu práctica' });
  }
});

// Registrar o corregir mi práctica.
// El supervisor se indica de una de dos formas:
//   - id_supervisor: uno ya validado de esa empresa (lo normal)
//   - supervisor: {...}: una SOLICITUD de supervisor nuevo, que queda pendiente de validación
router.put('/mi-practica', async (req, res) => {
  const rutEstudiante = req.session.user.rut_estudiante;
  if (!rutEstudiante) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  const b = req.body || {};
  const rutEmpresa = normalizarRut(b.rut_empresa);
  const sucursal = limpiar(b.sucursal);
  const departamento = limpiar(b.departamento);
  const jefeDirecto = limpiar(b.jefe_directo);
  const cargoJefe = limpiar(b.cargo_jefe_directo);

  if (!rutEmpresa) return res.status(400).json({ error: 'RUT de la empresa inválido' });
  if (sucursal.length > 150) return res.status(400).json({ error: 'La sucursal es demasiado larga' });
  if (!departamento || departamento.length > 100) return res.status(400).json({ error: 'Indica el departamento donde harás la práctica' });
  if (!jefeDirecto || jefeDirecto.length > 100) return res.status(400).json({ error: 'Indica el nombre del jefe directo' });
  if (!cargoJefe || cargoJefe.length > 100) return res.status(400).json({ error: 'Indica el cargo del jefe directo' });

  // Validación de los datos del supervisor solo si se está solicitando uno nuevo
  const usaListado = b.id_supervisor !== undefined && b.id_supervisor !== null;
  let sol = null;
  if (!usaListado) {
    const s = b.supervisor || {};
    sol = {
      rut: normalizarRut(s.rut),
      nombre: limpiar(s.nombre_completo),
      cargo: limpiar(s.cargo),
      telefono: limpiar(s.telefono),
      correo: limpiar(s.correo),
    };
    if (!sol.rut) return res.status(400).json({ error: 'RUT del supervisor inválido' });
    if (!sol.nombre || sol.nombre.length > 100) return res.status(400).json({ error: 'Indica el nombre del supervisor' });
    if (!sol.cargo || sol.cargo.length > 100) return res.status(400).json({ error: 'Indica el cargo del supervisor' });
    if (!REGEX_FONO.test(sol.telefono)) return res.status(400).json({ error: 'Teléfono del supervisor inválido' });
    if (!REGEX_CORREO.test(sol.correo) || sol.correo.length > 100) return res.status(400).json({ error: 'Correo del supervisor inválido' });
  } else if (!Number.isInteger(Number(b.id_supervisor))) {
    return res.status(400).json({ error: 'Supervisor inválido' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // La empresa debe existir en el banco maestro y estar activa
    const [centros] = await conn.query(
      'SELECT id_centro_practica FROM centros_practica WHERE rut_centro_practica = ? AND activo = 1',
      [rutEmpresa]
    );
    if (!centros[0]) {
      await conn.rollback();
      return res.status(404).json({ error: 'La empresa no está registrada en el sistema' });
    }
    const idCentro = centros[0].id_centro_practica;

    // Práctica vigente del alumno (si la hay) y si todavía puede modificarla
    const [vigentes] = await conn.query(
      `SELECT id_practica, etapa, estado_validacion, id_supervisor FROM practicas
        WHERE rut_estudiante = ? AND estado = 'vigente'
        ORDER BY id_practica DESC LIMIT 1 FOR UPDATE`,
      [rutEstudiante]
    );
    if (vigentes[0] && !puedeEditar(vigentes[0])) {
      await conn.rollback();
      return res.status(403).json({ error: 'Tu práctica ya fue validada o avanzó de etapa. Para cambios, habla con tu profesor tutor.' });
    }

    let idSupervisor;
    if (usaListado) {
      // Solo se acepta un supervisor validado y de esa misma empresa
      const [sups] = await conn.query(
        `SELECT id_supervisor FROM supervisores_practica
          WHERE id_supervisor = ? AND id_centro_practica = ? AND estado = 'validado'`,
        [Number(b.id_supervisor), idCentro]
      );
      if (!sups[0]) {
        await conn.rollback();
        return res.status(400).json({ error: 'Ese supervisor no es válido para esta empresa' });
      }
      idSupervisor = sups[0].id_supervisor;
    } else {
      // ¿Es el mismo supervisor que ya tiene asignado esta práctica? Entonces no se toca
      const [actual] = await conn.query(
        `SELECT id_supervisor FROM supervisores_practica
          WHERE id_supervisor = ? AND id_centro_practica = ? AND rut_supervisor = ?`,
        [vigentes[0] ? vigentes[0].id_supervisor : 0, idCentro, sol.rut]
      );
      if (actual[0]) {
        idSupervisor = actual[0].id_supervisor;
      } else {
        // Un supervisor que ya existe NUNCA se sobrescribe ni se expone: se debe elegir de la lista
        const [existe] = await conn.query(
          'SELECT id_supervisor FROM supervisores_practica WHERE id_centro_practica = ? AND rut_supervisor = ?',
          [idCentro, sol.rut]
        );
        if (existe[0]) {
          await conn.rollback();
          return res.status(409).json({ error: 'Ese supervisor ya está registrado en esta empresa. Pide a tu profesor tutor que lo habilite en la lista.' });
        }
        const [ins] = await conn.query(
          `INSERT INTO supervisores_practica
             (id_centro_practica, rut_supervisor, nombre_completo, cargo, telefono, correo, estado)
           VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
          [idCentro, sol.rut, sol.nombre, sol.cargo, sol.telefono, sol.correo]
        );
        idSupervisor = ins.insertId;
      }
    }

    if (vigentes[0]) {
      // Todo cambio del alumno devuelve la práctica a "pendiente de validación"
      await conn.query(
        `UPDATE practicas
            SET id_centro_practica = ?, id_supervisor = ?, sucursal = ?,
                departamento = ?, jefe_directo = ?, cargo_jefe_directo = ?,
                estado_validacion = 'pendiente', observacion_validacion = NULL,
                validada_por = NULL, validada_en = NULL
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
    res.json({ ok: true, estado_validacion: 'pendiente' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ese supervisor ya está registrado en esta empresa.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al guardar tu práctica' });
  } finally {
    conn.release();
  }
});

module.exports = router;