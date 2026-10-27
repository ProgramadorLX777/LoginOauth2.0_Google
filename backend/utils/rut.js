// Calcula el dígito verificador (módulo 11)
function calcularDv(cuerpo) {
  let suma = 0;
  let mult = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (suma % 11);
  if (r === 11) return '0';
  if (r === 10) return 'K';
  return String(r);
}

// Acepta "76.123.456-0", "76123456-0" o "761234560".
// Devuelve "76123456-0" si es válido, o null si no lo es.
function normalizarRut(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/[.\s]/g, '').toUpperCase();
  const m = /^(\d{1,8})-?([\dK])$/.exec(limpio);
  if (!m) return null;
  const cuerpo = String(Number(m[1]));
  const dv = m[2];
  if (calcularDv(cuerpo) !== dv) return null;
  return `${cuerpo}-${dv}`;
}

module.exports = { normalizarRut };