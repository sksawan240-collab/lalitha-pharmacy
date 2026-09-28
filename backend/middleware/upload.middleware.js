const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const ACCEPTED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_DOCS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_UPLOAD_MB || 2);

const storageFor = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const safe = (file.originalname || 'file')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 60);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
    },
  });

const fileFilter = (allowed) => (req, file, cb) => {
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(Object.assign(new Error('Unsupported file type. Allowed: ' + allowed.join(', ')), { code: 'FILE_TYPE_ERROR' }));
};

const uploadImage = (field = 'image', subdir = 'products') =>
  multer({
    storage: storageFor(subdir),
    limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
    fileFilter: fileFilter(ACCEPTED_IMAGES),
  }).single(field);

const uploadPrescription = (field = 'prescription', subdir = 'prescriptions') =>
  multer({
    storage: storageFor(subdir),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter(ACCEPTED_DOCS),
  }).single(field);

const uploadAvatar = (field = 'avatar', subdir = 'avatars') =>
  multer({
    storage: storageFor(subdir),
    limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
    fileFilter: fileFilter(ACCEPTED_IMAGES),
  }).single(field);

const publicUrl = (subdir, filename) =>
  filename ? `/uploads/${subdir}/${encodeURIComponent(filename)}` : '';

module.exports = { uploadImage, uploadPrescription, uploadAvatar, UPLOAD_ROOT, publicUrl };