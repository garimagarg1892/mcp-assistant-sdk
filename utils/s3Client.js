// utils/s3Client.js
const { S3Client } = require("@aws-sdk/client-s3");
require('dotenv').config();

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.AWS_REGION,
  forcePathStyle: true, // needed with MinIO
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = {s3Client} ;
