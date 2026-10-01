require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const generarPdfRoute = require('./routes/generarPdf.route');   // <-- NUEVO

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json());   // <-- NUEVO (sin esto no puede leer los datos del formulario)

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use('/auth', authRoutes);
app.use(generarPdfRoute);   // <-- NUEVO

app.listen(3000, () => console.log('Backend en http://localhost:3000'));