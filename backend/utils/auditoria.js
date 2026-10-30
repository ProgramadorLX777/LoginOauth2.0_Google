const pool = require('../db');

// Registra quién hizo qué y cuándo. Nunca se edita ni se borra.
async function registrarAuditoria(req, accion, entidad, idEntidad, detalle) {
  try {
    const u = (req.session && req.session.user) || {};
    await pool.query(
      `INSERT INTO auditoria (id_usuario, rol, accion, entidad, id_entidad, detalle, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id_usuario || null,
        u.rol || null,
        accion,
        entidad,
        idEntidad === undefined || idEntidad === null ? null : String(idEntidad),
        detalle ? JSON.stringify(detalle).slice(0, 5000) : null,
        req.ip || null,
      ]
    );
  } catch (err) {
    console.error('No se pudo registrar la auditoría:', err);
  }
}

module.exports = { registrarAuditoria };