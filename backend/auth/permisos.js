const pool = require('../db');

// Verifica en la base que la cuenta siga activa y refresca rol y vínculos desde ahí
async function cargarUsuarioVigente(req) {
  const sesion = req.session && req.session.user;
  if (!sesion || !sesion.id_usuario) return null;

  const [rows] = await pool.query(
    'SELECT rol, rut_estudiante, rut_docente FROM usuarios WHERE id_usuario = ? AND activo = 1',
    [sesion.id_usuario]
  );
  if (!rows[0]) return null;

  req.session.user.rol = rows[0].rol;
  req.session.user.rut_estudiante = rows[0].rut_estudiante;
  req.session.user.rut_docente = rows[0].rut_docente;
  return req.session.user;
}

async function requireAuth(req, res, next) {
  try {
    const user = await cargarUsuarioVigente(req);
    if (!user) {
      req.session = null;
      return res.status(401).json({ error: 'No autenticado' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

function requireRol(...rolesPermitidos) {
  return async (req, res, next) => {
    try {
      const user = await cargarUsuarioVigente(req);
      if (!user) {
        req.session = null;
        return res.status(401).json({ error: 'No autenticado' });
      }
      if (!rolesPermitidos.includes(user.rol)) {
        return res.status(403).json({ error: 'Sin permiso' });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error de autenticación' });
    }
  };
}

module.exports = { requireAuth, requireRol };