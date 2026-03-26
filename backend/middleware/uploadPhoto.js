const multer = require('multer');
const path = require('path');
const fs = require('fs');

const photoDir = path.join(__dirname, '..', 'uploads', 'appointment-photos');
if (!fs.existsSync(photoDir)) {
  fs.mkdirSync(photoDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, photoDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'visitor-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const photoFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, and PNG images are allowed'));
  }
};

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: photoFileFilter
});

module.exports = uploadPhoto;
