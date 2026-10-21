const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');

// Todo lo que cuelga de /estudiante es solo para el rol estudiante
router.use(requireRol('estudiante'));

const REGEX_FONO = /^[0-9+\s-]{8,15}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ver mi perfil
router.get('/mi-perfil', async (req, res) => {
  // El RUT sale de la sesión, NUNCA de lo que mande el navegador
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  try {
    const [rows] = await pool.query(
      `SELECT rut_completo, nombre_completo, curso, especialidad, estado,
              DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
              direccion, comuna, correo, telefono_estudiante, celular_estudiante
         FROM estudiantes
        WHERE rut_estudiante = ?`,
      [rut]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
});

// Actualizar mis datos de contacto
router.put('/mi-perfil', async (req, res) => {
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  const limpiar = v => (typeof v === 'string' ? v.trim() : '');
  const direccion = limpiar(req.body.direccion);
  const comuna = limpiar(req.body.comuna);
  const correo = limpiar(req.body.correo);
  const telefono = limpiar(req.body.telefono_estudiante);
  const celular = limpiar(req.body.celular_estudiante);

  if (!direccion || direccion.length > 100) return res.status(400).json({ error: 'Dirección inválida' });
  if (!comuna || comuna.length > 100) return res.status(400).json({ error: 'Comuna inválida' });
  if (correo && (!REGEX_CORREO.test(correo) || correo.length > 100)) return res.status(400).json({ error: 'Correo inválido' });
  if (telefono && !REGEX_FONO.test(telefono)) return res.status(400).json({ error: 'Teléfono inválido' });
  if (celular && !REGEX_FONO.test(celular)) return res.status(400).json({ error: 'Celular inválido' });

  try {
    // Solo se pueden cambiar estos 5 campos; RUT, nombre, curso, especialidad y estado los controla el administrador
    await pool.query(
      `UPDATE estudiantes
          SET direccion = ?, comuna = ?, correo = ?, telefono_estudiante = ?, celular_estudiante = ?
        WHERE rut_estudiante = ?`,
      [direccion, comuna, correo || null, telefono || null, celular || null, rut]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el perfil' });
  }
});

module.exports = router;