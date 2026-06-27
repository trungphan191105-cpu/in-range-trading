import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth';

const router = Router();
router.use(verifyToken);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname);
    cb(null, ok);
  },
});

router.post('/screenshot', upload.single('file'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
