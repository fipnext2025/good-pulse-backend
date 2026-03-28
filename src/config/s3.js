const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const createUpload = (folder, maxSize, allowedMimes) => {
  return multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
      }
    },
  });
};

const imageUpload = createUpload(
  'images',
  5 * 1024 * 1024, // 5MB
  ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

const videoUpload = createUpload(
  'videos',
  100 * 1024 * 1024, // 100MB
  ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
);

const deleteS3Object = async (key) => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error('S3 delete error:', error.message);
  }
};

module.exports = { s3Client, imageUpload, videoUpload, deleteS3Object };
