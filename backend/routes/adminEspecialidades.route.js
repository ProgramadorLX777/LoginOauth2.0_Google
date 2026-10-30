const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');
const { registrarAuditoria } = require('../utils/auditoria');

router.use(requireRol('administrador'));

const limpiar = v => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// Lista de especialidades
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_especialidad, nombre, mencion, activa
         FROM especialidades
        ORDER BY nombre, mencion`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las especialidades' });
  }
});

// Crear una especialidad (con mención opcional)
router.post('/', async (req, res) => {
  const nombre = limpiar(req.body.nombre);
  const mencion = limpiar(req.body.mencion);

  if (nombre.length < 2 || nombre.length > 80) return res.status(400).json({ error: 'El nombre debe tener entre 2 y 80 caracteres' });
  if (mencion.length > 80) return res.status(400).json({ error: 'La mención es demasiado larga' });

  try {
    const [r] = await pool.query('INSERT INTO especialidades (nombre, mencion) VALUES (?, ?)', [nombre, mencion]);
    await registrarAuditoria(req, 'crear', 'especialidad', r.insertId, { nombre, mencion });
    res.status(201).json({ ok: true, id_especialidad: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esa especialidad ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear la especialidad' });
  }
});

// Activar o desactivar. No se permite renombrar por ahora: los estudiantes y docentes
// todavía guardan el nombre como texto y quedarían desvinculados.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || typeof req.body.activa !== 'boolean') {
    return res.status(400).json({ error: 'Solicitud inválida' });
  }

  try {
    const [r] = await pool.query('UPDATE especialidades SET activa = ? WHERE id_especialidad = ?', [req.body.activa ? 1 : 0, id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Especialidad no encontrada' });
    await registrarAuditoria(req, req.body.activa ? 'activar' : 'desactivar', 'especialidad', id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la especialidad' });
  }
});

module.exports = router;