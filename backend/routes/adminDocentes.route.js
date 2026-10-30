const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');
const { normalizarRut } = require('../utils/rut');
const { REGEX_FONO, REGEX_CORREO, REGEX_NOMBRE, limpiar, formatearRut } = require('../utils/validaciones');
const { registrarAuditoria } = require('../utils/auditoria');

router.use(requireRol('administrador'));

// Valida y normaliza los datos de un docente. Devuelve { error } o { d }
function validarDocente(b, esAlta) {
  const d = {
    nombre: limpiar(b.nombre),
    apellido_paterno: limpiar(b.apellido_paterno),
    apellido_materno: limpiar(b.apellido_materno),
    correo: limpiar(b.correo).toLowerCase(),
    telefono: limpiar(b.telefono),
    celular: limpiar(b.celular),
    cargo: limpiar(b.cargo),
    jefe_directo: limpiar(b.jefe_directo),
    cargo_jefe_directo: limpiar(b.cargo_jefe_directo),
    id_especialidad: Number(b.id_especialidad),
    crear_cuenta: b.crear_cuenta !== false,
  };

  if (esAlta) {
    d.rut = normalizarRut(b.rut);
    if (!d.rut) return { error: 'RUT inválido. Revisa el número y el dígito verificador.' };
  }
  if (!d.nombre || d.nombre.length > 70 || !REGEX_NOMBRE.test(d.nombre)) return { error: 'Nombre inválido' };
  if (!d.apellido_paterno || d.apellido_paterno.length > 80 || !REGEX_NOMBRE.test(d.apellido_paterno)) return { error: 'Apellido paterno inválido' };
  if (d.apellido_materno && (d.apellido_materno.length > 80 || !REGEX_NOMBRE.test(d.apellido_materno))) return { error: 'Apellido materno inválido' };
  if (!REGEX_CORREO.test(d.correo) || d.correo.length > 100) return { error: 'Correo inválido' };
  if (d.telefono && !REGEX_FONO.test(d.telefono)) return { error: 'Teléfono inválido' };
  if (d.celular && !REGEX_FONO.test(d.celular)) return { error: 'Celular inválido' };
  if (!d.cargo || d.cargo.length > 100) return { error: 'Indica el cargo' };
  if (d.jefe_directo.length > 100 || d.cargo_jefe_directo.length > 100) return { error: 'Jefe directo o cargo demasiado largo' };
  if (!Number.isInteger(d.id_especialidad) || d.id_especialidad < 1) return { error: 'Selecciona una especialidad' };

  return { d };
}

// Devuelve el texto de la especialidad si existe y está activa
async function textoEspecialidad(conn, id) {
  const [rows] = await conn.query(
    'SELECT nombre, mencion FROM especialidades WHERE id_especialidad = ? AND activa = 1',
    [id]
  );
  if (!rows[0]) return null;
  const { nombre, mencion } = rows[0];
  return (mencion ? `${nombre} mención ${mencion}` : nombre).slice(0, 80);
}

function nombresDerivados(d) {
  return {
    completo: [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ').slice(0, 100),
    corto: `${d.nombre.split(' ')[0]} ${d.apellido_paterno}`.slice(0, 50),
  };
}

// Lista de docentes con búsqueda y filtro por estado
router.get('/', async (req, res) => {
  const q = limpiar(req.query.q);
  const estado = ['activo', 'inactivo'].includes(req.query.estado) ? req.query.estado : null;

  let where = 'WHERE 1=1';
  const params = [];
  if (q) {
    where += ' AND (d.nombre_completo LIKE ? OR d.rut_completo LIKE ? OR d.correo LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (estado) {
    where += ' AND d.estado = ?';
    params.push(estado);
  }

  try {
    const [rows] = await pool.query(
      `SELECT d.rut_docente, d.rut_completo, d.nombre, d.apellido_paterno, d.apellido_materno,
              d.nombre_completo, d.correo, d.telefono_docente, d.celular_docente,
              d.cargo, d.jefe_directo, d.cargo_jefe_directo, d.estado,
              d.id_especialidad, d.especialidad,
              (u.id_usuario IS NOT NULL) AS tiene_cuenta,
              COALESCE(u.activo, 0) AS cuenta_activa,
              (SELECT COUNT(*) FROM estudiantes e WHERE e.rut_docente_tutor = d.rut_docente) AS estudiantes
         FROM docentes d
         LEFT JOIN usuarios u ON u.rut_docente = d.rut_docente
         ${where}
        ORDER BY d.apellido_paterno, d.nombre
        LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los docentes' });
  }
});

// Crear docente (y, si se pide, su cuenta de acceso, todo en una sola operación)
router.post('/', async (req, res) => {
  const { error, d } = validarDocente(req.body || {}, true);
  if (error) return res.status(400).json({ error });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const especialidad = await textoEspecialidad(conn, d.id_especialidad);
    if (!especialidad) {
      await conn.rollback();
      return res.status(400).json({ error: 'La especialidad no existe o está inactiva' });
    }

    const rutNumero = Number(d.rut.split('-')[0]);
    const n = nombresDerivados(d);

    await conn.query(
      `INSERT INTO docentes
         (rut_docente, rut_completo, nombre_corto, nombre_completo, nombre,
          apellido_paterno, apellido_materno, correo, telefono_docente, celular_docente,
          especialidad, id_especialidad, cargo, jefe_directo, cargo_jefe_directo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rutNumero, formatearRut(d.rut), n.corto, n.completo, d.nombre,
        d.apellido_paterno, d.apellido_materno || null, d.correo,
        d.telefono || null, d.celular || null,
        especialidad, d.id_especialidad, d.cargo,
        d.jefe_directo || null, d.cargo_jefe_directo || null,
      ]
    );

    if (d.crear_cuenta) {
      await conn.query(
        "INSERT INTO usuarios (correo, rol, rut_docente) VALUES (?, 'docente', ?)",
        [d.correo, rutNumero]
      );
    }

    await conn.commit();
    await registrarAuditoria(req, 'crear', 'docente', rutNumero, { cuenta: d.crear_cuenta, especialidad });
    res.status(201).json({ ok: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = /correo/i.test(err.sqlMessage || '')
        ? 'Ya existe una cuenta con ese correo'
        : 'Ya existe un docente con ese RUT';
      return res.status(409).json({ error: msg });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al crear el docente' });
  } finally {
    conn.release();
  }
});

// Editar datos de un docente (el RUT no se puede cambiar)
router.put('/:rut', async (req, res) => {
  const rutNumero = Number(req.params.rut);
  if (!Number.isInteger(rutNumero)) return res.status(400).json({ error: 'Solicitud inválida' });

  const { error, d } = validarDocente(req.body || {}, false);
  if (error) return res.status(400).json({ error });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [actual] = await conn.query('SELECT correo FROM docentes WHERE rut_docente = ? FOR UPDATE', [rutNumero]);
    if (!actual[0]) {
      await conn.rollback();
      return res.status(404).json({ error: 'Docente no encontrado' });
    }

    const especialidad = await textoEspecialidad(conn, d.id_especialidad);
    if (!especialidad) {
      await conn.rollback();
      return res.status(400).json({ error: 'La especialidad no existe o está inactiva' });
    }

    const n = nombresDerivados(d);
    await conn.query(
      `UPDATE docentes
          SET nombre = ?, apellido_paterno = ?, apellido_materno = ?,
              nombre_completo = ?, nombre_corto = ?, correo = ?,
              telefono_docente = ?, celular_docente = ?, cargo = ?,
              jefe_directo = ?, cargo_jefe_directo = ?,
              especialidad = ?, id_especialidad = ?
        WHERE rut_docente = ?`,
      [
        d.nombre, d.apellido_paterno, d.apellido_materno || null,
        n.completo, n.corto, d.correo,
        d.telefono || null, d.celular || null, d.cargo,
        d.jefe_directo || null, d.cargo_jefe_directo || null,
        especialidad, d.id_especialidad, rutNumero,
      ]
    );

    // Si cambia el correo, también cambia el de su cuenta de acceso
    const correoCambio = actual[0].correo !== d.correo;
    if (correoCambio) {
      await conn.query('UPDATE usuarios SET correo = ? WHERE rut_docente = ?', [d.correo, rutNumero]);
    }

    await conn.commit();
    await registrarAuditoria(req, 'editar', 'docente', rutNumero,
      correoCambio ? { correo_anterior: actual[0].correo, correo_nuevo: d.correo } : null);
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el docente' });
  } finally {
    conn.release();
  }
});

// Activar o desactivar (también su cuenta de acceso). Nunca se elimina.
router.put('/:rut/estado', async (req, res) => {
  const rutNumero = Number(req.params.rut);
  if (!Number.isInteger(rutNumero) || typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'Solicitud inválida' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query('UPDATE docentes SET estado = ? WHERE rut_docente = ?',
      [req.body.activo ? 'activo' : 'inactivo', rutNumero]);
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    await conn.query('UPDATE usuarios SET activo = ? WHERE rut_docente = ?', [req.body.activo ? 1 : 0, rutNumero]);
    await conn.commit();
    await registrarAuditoria(req, req.body.activo ? 'activar' : 'desactivar', 'docente', rutNumero);
    res.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar el estado' });
  } finally {
    conn.release();
  }
});

module.exports = router;