const pool = require('../db');

async function buscarUsuarioActivoPorCorreo(correo) {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.correo, u.rol, u.rut_estudiante, u.rut_docente,
            COALESCE(e.nombre_corto, d.nombre_corto) AS nombre
       FROM usuarios u
       LEFT JOIN estudiantes e ON e.rut_estudiante = u.rut_estudiante
       LEFT JOIN docentes d ON d.rut_docente = u.rut_docente
      WHERE u.correo = ? AND u.activo = 1
      LIMIT 1`,
    [correo]
  );
  return rows[0] || null;
}

module.exports = { buscarUsuarioActivoPorCorreo };