function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

function requireRol(...rolesPermitidos) {
  return (req, res, next) => {
    const user = req.session && req.session.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!rolesPermitidos.includes(user.rol)) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRol };