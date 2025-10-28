// utils/s3Client.js
const { S3Client } = require("@aws-sdk/client-s3");
const https = require("https");
require("dotenv").config();

// Create HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Use fallback region if not set
const region = process.env.AWS_REGION || "us-east-1";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: region,
  forcePathStyle: true, // needed with MinIO
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Handle self-signed certificates for internal S3 services
  requestHandler: {
    httpsAgent: httpsAgent,
  },
});

module.exports = { s3Client };
