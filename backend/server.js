require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const generarPdfRoute = require('./routes/generarPdf.route');  
const estudianteRoutes = require('./routes/estudiante.route');
const misDocumentosRoutes = require('./routes/misDocumentos.route'); 
const miEmpresaRoutes = require('./routes/miEmpresa.route');
const docenteRoutes = require('./routes/docente.route'); 
const adminEspecialidadesRoutes = require('./routes/adminEspecialidades.route');
const adminGeneracionesRoutes = require('./routes/adminGeneraciones.route');
const adminDocentesRoutes = require('./routes/adminDocentes.route');

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
app.use('/estudiante', estudianteRoutes);
app.use('/estudiante', miEmpresaRoutes);
app.use('/estudiante', misDocumentosRoutes);
app.use('/docente', docenteRoutes);
app.use('/admin/especialidades', adminEspecialidadesRoutes);
app.use('/admin/generaciones', adminGeneracionesRoutes);  
app.use('/admin/docentes', adminDocentesRoutes);  
app.use(generarPdfRoute);   

app.listen(3000, () => console.log('Backend en http://localhost:3000'));