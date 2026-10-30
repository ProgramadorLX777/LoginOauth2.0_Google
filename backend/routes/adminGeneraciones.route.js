const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');
const { registrarAuditoria } = require('../utils/auditoria');

// Todo lo que cuelga de /admin/generaciones es solo para el administrador
router.use(requireRol('administrador'));

const ANIO_MINIMO = 2026;

// Lista de generaciones con la cantidad de estudiantes de cada una
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.anio, g.nombre, g.activa, COUNT(e.rut_estudiante) AS estudiantes
         FROM generaciones g
         LEFT JOIN estudiantes e ON e.anio_generacion = g.anio
        GROUP BY g.anio, g.nombre, g.activa
        ORDER BY g.anio DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las generaciones' });
  }
});

// Crear una generación nueva
router.post('/', async (req, res) => {
  const anio = Number(req.body.anio);
  const excepcion = req.body.excepcion === true;

  if (!Number.isInteger(anio) || anio < 1990 || anio > 2100) {
    return res.status(400).json({ error: 'Año inválido' });
  }
  // Regla de la guía: antes de 2026 solo como excepción confirmada
  if (anio < ANIO_MINIMO && !excepcion) {
    return res.status(400).json({
      error: 'Las generaciones anteriores a 2026 requieren confirmar la excepción',
      codigo: 'REQUIERE_EXCEPCION',
    });
  }

  try {
    await pool.query('INSERT INTO generaciones (anio, nombre) VALUES (?, ?)', [anio, `Generación ${anio}`]);
    await registrarAuditoria(req, 'crear', 'generacion', anio, { excepcion });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esa generación ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear la generación' });
  }
});

// Activar o desactivar una generación (nunca se elimina, para conservar la historia)
router.put('/:anio', async (req, res) => {
  const anio = Number(req.params.anio);
  if (!Number.isInteger(anio) || typeof req.body.activa !== 'boolean') {
    return res.status(400).json({ error: 'Solicitud inválida' });
  }

  try {
    const [r] = await pool.query('UPDATE generaciones SET activa = ? WHERE anio = ?', [req.body.activa ? 1 : 0, anio]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Generación no encontrada' });
    await registrarAuditoria(req, req.body.activa ? 'activar' : 'desactivar', 'generacion', anio);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la generación' });
  }
});

module.exports = router;