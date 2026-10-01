const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const libre = require('libreoffice-convert');

const router = express.Router();

router.post('/api/generar-documento', (req, res) => {
  try {
    const datos = req.body;

    const rutaPlantilla = path.resolve(__dirname, '..', 'plantillas/plantilla_practica.docx');
    const contenido = fs.readFileSync(rutaPlantilla, 'binary');

    const zip = new PizZip(contenido);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(datos);

    const bufDocx = doc.getZip().generate({ type: 'nodebuffer' });

    libre.convert(bufDocx, '.pdf', undefined, (err, bufPdf) => {
      if (err) {
        console.error('Error al convertir a PDF:', err);
        return res.status(500).send('Error al convertir a PDF');
      }

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=documento_${datos.rut || 'practica'}.pdf`,
      });
      res.send(bufPdf);
    });
  } catch (error) {
    console.error('Error al generar el documento:', error);
    res.status(500).send('Error al generar el documento: ' + error.message);
  }
});

module.exports = router;