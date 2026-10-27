const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRol } = require('../auth/permisos');

// Todo lo que cuelga de /estudiante es solo para el rol estudiante
router.use(requireRol('estudiante'));

const REGEX_FONO = /^[0-9+\s-]{8,15}$/;

// Qué datos faltan para considerar completo el perfil
function calcularFaltantes(p) {
  const faltantes = [];
  if (!p.direccion || !p.direccion.trim()) faltantes.push('dirección');
  if (!p.comuna || !p.comuna.trim()) faltantes.push('comuna');
  if (!p.telefono_estudiante && !p.celular_estudiante) faltantes.push('teléfono o celular');
  return faltantes;
}

// Ver mi perfil
router.get('/mi-perfil', async (req, res) => {
  // El RUT sale de la sesión, NUNCA de lo que mande el navegador
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  try {
    const [rows] = await pool.query(
      `SELECT e.rut_completo, e.nombre_completo, e.curso, e.especialidad, e.estado,
              e.anio_generacion, e.correo AS correo_institucional,
              DATE_FORMAT(e.fecha_nacimiento, '%Y-%m-%d') AS fecha_nacimiento,
              e.direccion, e.comuna, e.telefono_estudiante, e.celular_estudiante,
              d.nombre_completo AS tutor_nombre, d.correo AS tutor_correo
         FROM estudiantes e
         LEFT JOIN docentes d ON d.rut_docente = e.rut_docente_tutor
        WHERE e.rut_estudiante = ?`,
      [rut]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const faltantes = calcularFaltantes(rows[0]);
    res.json({ ...rows[0], perfil_completo: faltantes.length === 0, faltantes });
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
  const telefono = limpiar(req.body.telefono_estudiante);
  const celular = limpiar(req.body.celular_estudiante);

  if (!direccion || direccion.length > 100) return res.status(400).json({ error: 'Dirección inválida' });
  if (!comuna || comuna.length > 100) return res.status(400).json({ error: 'Comuna inválida' });
  if (telefono && !REGEX_FONO.test(telefono)) return res.status(400).json({ error: 'Teléfono inválido' });
  if (celular && !REGEX_FONO.test(celular)) return res.status(400).json({ error: 'Celular inválido' });

  try {
    // El alumno solo cambia estos 4 campos. El correo institucional, RUT, nombre,
    // curso, especialidad, generación y tutor los controla el administrador
    await pool.query(
      `UPDATE estudiantes
          SET direccion = ?, comuna = ?, telefono_estudiante = ?, celular_estudiante = ?
        WHERE rut_estudiante = ?`,
      [direccion, comuna, telefono || null, celular || null, rut]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el perfil' });
  }
});

module.exports = router;