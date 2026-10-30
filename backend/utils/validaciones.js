const REGEX_FONO = /^[0-9+\s-]{8,15}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Solo letras (con tildes), espacios, apóstrofe, punto y guion
const REGEX_NOMBRE = /^[\p{L}][\p{L}\s'.-]*$/u;

// Quita espacios sobrantes
const limpiar = v => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// "22222222-2" -> "22.222.222-2"
function formatearRut(rutNormalizado) {
  const [cuerpo, dv] = rutNormalizado.split('-');
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}

module.exports = { REGEX_FONO, REGEX_CORREO, REGEX_NOMBRE, limpiar, formatearRut };