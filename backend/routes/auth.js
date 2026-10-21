// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const oAuth2Client = require('../auth/googleClient');
const { buscarUsuarioActivoPorCorreo } = require('../auth/usuarios');

// Paso 1: el usuario hace clic en "Iniciar sesión con Google"
// El frontend simplemente redirige el navegador a esta ruta
router.get('/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state; // guardamos el state para validarlo luego (CSRF)

  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'consent'
  });

  res.redirect(url);
});

// Paso 2: Google redirige aquí con el "code"
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.oauthState) {
    return res.status(403).send('State inválido (posible CSRF)');
  }

  try {
    // Intercambiamos el code por tokens
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Obtenemos datos del usuario desde el id_token
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    // payload contiene: email, name, picture, sub (id de Google), etc.

    // El correo de Google debe estar verificado
    if (!payload.email_verified) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=correo_no_verificado`);
    }

    // Solo entra quien esté registrado y activo en la tabla usuarios
    const usuario = await buscarUsuarioActivoPorCorreo(payload.email);
    if (!usuario) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_autorizado`);
    }

    // Creamos tu propia sesión, ahora con el rol que viene de la BD
    req.session.user = {
      id_usuario: usuario.id_usuario,
      email: payload.email,
      name: usuario.nombre || payload.name,
      googleId: payload.sub,
      rol: usuario.rol,
      rut_estudiante: usuario.rut_estudiante,
      rut_docente: usuario.rut_docente
    };

    // Redirigimos de vuelta al frontend, ya logueado
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Endpoint para que Angular consulte si hay sesión activa
// Consulta la BD cada vez: si el admin desactiva a alguien o le cambia el rol, se nota de inmediato
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ authenticated: false });
    
  }

  try {
    const usuario = await buscarUsuarioActivoPorCorreo(req.session.user.email);
    if (!usuario) {
      req.session = null;
      return res.status(401).json({ authenticated: false });
    }

    req.session.user.rol = usuario.rol;
    req.session.user.rut_estudiante = usuario.rut_estudiante;
    req.session.user.rut_docente = usuario.rut_docente;
    res.json({ authenticated: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

module.exports = router;