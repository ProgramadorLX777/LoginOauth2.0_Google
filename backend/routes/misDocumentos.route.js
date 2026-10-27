const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../db');
const { requireRol } = require('../auth/permisos');

router.use(requireRol('estudiante'));

// Carpeta fuera de lo público: los archivos solo salen por la ruta de descarga
const CARPETA = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(CARPETA, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, CARPETA),
    // Nombre aleatorio: no se usa el nombre que manda el usuario
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + '.pdf'),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('SOLO_PDF'));
    cb(null, true);
  },
});

function borrarArchivo(ruta) {
  fs.unlink(ruta, () => {});
}

// Lista de documentos: cada tipo con su última versión (o sin nada si aún no sube)
router.get('/mis-documentos', async (req, res) => {
  const rut = req.session.user.rut_estudiante;
  if (!rut) return res.status(404).json({ error: 'Tu cuenta no está vinculada a un estudiante' });

  try {
    const [rows] = await pool.query(
      `SELECT t.id_tipo_documento, t.nombre, t.descripcion, t.obligatorio,
              d.id_documento, d.version, d.estado, d.observacion,
              d.nombre_original, d.creado_en
         FROM tipos_documento t
         LEFT JOIN documentos d ON d.id_documento = (
              SELECT d2.id_documento
                FROM documentos d2
               WHERE d2.rut_estudiante = ? AND d2.id_tipo_documento = t.id_tipo_documento
               ORDER BY d2.version DESC
               LIMIT 1)
        WHERE t.activo = 1
        ORDER BY t.id_tipo_documento`,
      [rut]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los documentos' });
  }
});

// Subir una versión nueva de un documento
router.post('/mis-documentos/:idTipo', (req, res) => {
  upload.single('archivo')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'El archivo supera los 5 MB' });
      if (err.message === 'SOLO_PDF') return res.status(400).json({ error: 'Solo se permiten archivos PDF' });
      console.error(err);
      return res.status(400).json({ error: 'No se pudo recibir el archivo' });
    }

    const rut = req.session.user.rut_estudiante;
    const idTipo = Number(req.params.idTipo);
    const archivo = req.file;

    if (!archivo) return res.status(400).json({ error: 'Debes adjuntar un archivo' });
    const rutaArchivo = archivo.path;

    if (!rut || !Number.isInteger(idTipo)) {
      borrarArchivo(rutaArchivo);
      return res.status(400).json({ error: 'Solicitud inválida' });
    }

    // Verificamos que realmente sea un PDF (los primeros bytes deben ser "%PDF-")
    try {
      const fd = fs.openSync(rutaArchivo, 'r');
      const buf = Buffer.alloc(5);
      fs.readSync(fd, buf, 0, 5, 0);
      fs.closeSync(fd);
      if (buf.toString('latin1') !== '%PDF-') {
        borrarArchivo(rutaArchivo);
        return res.status(400).json({ error: 'El archivo no es un PDF válido' });
      }
    } catch (e) {
      borrarArchivo(rutaArchivo);
      return res.status(400).json({ error: 'No se pudo leer el archivo' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [tipos] = await conn.query(
        'SELECT id_tipo_documento FROM tipos_documento WHERE id_tipo_documento = ? AND activo = 1',
        [idTipo]
      );
      if (!tipos[0]) {
        await conn.rollback();
        borrarArchivo(rutaArchivo);
        return res.status(404).json({ error: 'Tipo de documento no existe' });
      }

      const [ultimo] = await conn.query(
        `SELECT version, estado FROM documentos
          WHERE rut_estudiante = ? AND id_tipo_documento = ?
          ORDER BY version DESC LIMIT 1 FOR UPDATE`,
        [rut, idTipo]
      );

      if (ultimo[0] && ultimo[0].estado === 'aprobado') {
        await conn.rollback();
        borrarArchivo(rutaArchivo);
        return res.status(409).json({ error: 'Este documento ya fue aprobado y no se puede reemplazar' });
      }

      const nuevaVersion = ultimo[0] ? ultimo[0].version + 1 : 1;

      // Las versiones anteriores quedan como "reemplazado"; nunca se borran
      await conn.query(
        `UPDATE documentos SET estado = 'reemplazado'
          WHERE rut_estudiante = ? AND id_tipo_documento = ? AND estado <> 'reemplazado'`,
        [rut, idTipo]
      );

      await conn.query(
        `INSERT INTO documentos
           (rut_estudiante, id_tipo_documento, version, nombre_original, nombre_archivo, tamano_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [rut, idTipo, nuevaVersion, archivo.originalname.slice(0, 200), archivo.filename, archivo.size]
      );

      await conn.commit();
      res.json({ ok: true, version: nuevaVersion });
    } catch (e) {
      await conn.rollback();
      borrarArchivo(rutaArchivo);
      console.error(e);
      res.status(500).json({ error: 'Error al guardar el documento' });
    } finally {
      conn.release();
    }
  });
});

// Descargar uno de MIS documentos
router.get('/documentos/:idDocumento/descargar', async (req, res) => {
  const rut = req.session.user.rut_estudiante;
  const idDocumento = Number(req.params.idDocumento);
  if (!rut || !Number.isInteger(idDocumento)) return res.status(400).json({ error: 'Solicitud inválida' });

  try {
    // El "AND rut_estudiante = ?" impide que un alumno baje documentos de otro
    const [rows] = await pool.query(
      'SELECT nombre_archivo, nombre_original FROM documentos WHERE id_documento = ? AND rut_estudiante = ?',
      [idDocumento, rut]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Documento no encontrado' });

    res.download(path.join(CARPETA, rows[0].nombre_archivo), rows[0].nombre_original);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al descargar el documento' });
  }
});

module.exports = router;