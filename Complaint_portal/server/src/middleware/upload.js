import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, 'Only JPEG, PNG or WebP images are allowed'));
  },
});

/** Accepts up to 5 images in the "images" field. */
export const uploadImages = upload.array('images', MAX_IMAGES);
