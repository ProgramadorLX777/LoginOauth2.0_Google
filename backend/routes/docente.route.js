const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');

// Todo lo que cuelga de /docente es solo para el rol docente
router.use(requireRol('docente'));

// Estudiantes de los que este docente es tutor
router.get('/mis-estudiantes', async (req, res) => {
  // El RUT del docente sale de la sesión, nunca del navegador
  const rutDocente = req.session.user.rut_docente;
  if (!rutDocente) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un docente' });

  try {
    // Solo los datos necesarios para el seguimiento: no se exponen dirección, teléfono ni fecha de nacimiento
    const [rows] = await pool.query(
      `SELECT rut_completo, nombre_completo, curso, especialidad,
              anio_generacion, estado, correo AS correo_institucional
         FROM estudiantes
        WHERE rut_docente_tutor = ?
        ORDER BY anio_generacion, apellido_paterno, nombre`,
      [rutDocente]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tus estudiantes' });
  }
});

module.exports = router;