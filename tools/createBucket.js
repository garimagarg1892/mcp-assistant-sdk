// tools/createBucket.js - Smart Parameter Mapping
const { s3Client } = require("../utils/s3Client");
const { CreateBucketCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");

async function createBucket(params) {
  console.log(
    "🔍 Received parameters from AI:",
    JSON.stringify(params, null, 2)
  );

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

  console.log("📤 Sending to AWS S3:", JSON.stringify(commandParams, null, 2));

  const command = new CreateBucketCommand(commandParams);

  try {
    const result = await s3Client.send(command);
    return {
      success: true,
      message: `✅ Bucket "${params.bucketName}" created successfully!`,
      aiExtractedParams: params,
      awsCommandParams: commandParams,
      awsResponse: {
        location: result.Location,
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

module.exports = createBucket;
