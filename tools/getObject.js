// tools/getObject.js - Smart Parameter Mapping
const { s3Client } = require('../utils/s3Client');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const parameterMapper = require('../utils/parameterMapper');

async function getObject(params) {
  console.log('🔍 Received parameters from AI:', JSON.stringify(params, null, 2));
  
  // Validate required parameters
  if (!params.bucketName || !params.fileName) {
    return {
      success: false,
      message: 'Error: bucketName and fileName are required.',
      receivedParams: params
    };
  }

  // Use smart parameter mapper for AWS SDK compliance
  const commandParams = parameterMapper.mapParameters(params);

  console.log('📤 Sending to AWS S3:', JSON.stringify(commandParams, null, 2));

  const command = new GetObjectCommand(commandParams);
  
  try {
    const result = await s3Client.send(command);
    
    // Read the stream into a buffer
    const streamToBuffer = async (stream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    };
    
    const bodyBuffer = await streamToBuffer(result.Body);
    
    return {
      success: true,
      message: `✅ File "${params.fileName}" downloaded from bucket "${params.bucketName}" successfully!`,
      fileName: params.fileName,
      fileContent: bodyBuffer.toString('base64'),
      fileSize: bodyBuffer.length,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag,
      aiExtractedParams: params,
      awsCommandParams: commandParams,
      awsResponse: {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata,
        serverSideEncryption: result.ServerSideEncryption
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ AWS Error: ${error.message}`,
      errorDetails: {
        errorCode: error.name,
        errorMessage: error.message,
        aiExtractedParams: params,
        awsCommandParams: commandParams
      }
    };
  }
}

module.exports = getObject;