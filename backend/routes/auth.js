// routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const oAuth2Client = require('../auth/googleClient');

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

    // Aquí buscas/creas al usuario en tu BD
    // const user = await findOrCreateUser(payload);

    // Creamos tu propia sesión
    req.session.user = {
      email: payload.email,
      name: payload.name,
      googleId: payload.sub
    };

    // Redirigimos de vuelta al frontend, ya logueado
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error(err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Endpoint para que Angular consulte si hay sesión activa
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

module.exports = router;