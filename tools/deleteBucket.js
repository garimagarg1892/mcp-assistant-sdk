// tools/deleteBucket.js - Smart Parameter Mapping
const { s3Client } = require("../utils/s3Client");
const { DeleteBucketCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");

async function deleteBucket(params) {
  // Validate required parameter
  if (!params.bucketName) {
    return {
      success: false,
      message: "Error: bucketName is required. Please provide a bucket name.",
      receivedParams: params,
    };
  }

  // Use smart parameter mapper for AWS SDK compliance
  const commandParams = parameterMapper.mapParameters(params);

  const command = new DeleteBucketCommand(commandParams);

  try {
    const result = await s3Client.send(command);
    return {
      success: true,
      message: `✅ Bucket "${params.bucketName}" deleted successfully!`,
      aiExtractedParams: params,
      awsCommandParams: commandParams,
      awsResponse: {
        metadata: result.$metadata,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ AWS Error: ${error.message}`,
      errorDetails: {
        errorCode: error.name,
        errorMessage: error.message,
        aiExtractedParams: params,
        awsCommandParams: commandParams,
      },
    };
  }
}

module.exports = deleteBucket;
