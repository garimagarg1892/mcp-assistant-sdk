// tools/listBuckets.js - Smart Parameter Mapping
const { s3Client } = require("../utils/s3Client");
const { ListBucketsCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");

async function listBuckets(params = {}) {
  console.log(
    "🔍 Received parameters from AI:",
    JSON.stringify(params, null, 2)
  );

  // Use smart parameter mapper for AWS SDK compliance
  const awsParams = parameterMapper.mapParameters(params);

  console.log("📤 Sending to AWS S3:", JSON.stringify(awsParams, null, 2));

  const command = new ListBucketsCommand(awsParams);

  try {
    const result = await s3Client.send(command);
    return {
      success: true,
      buckets: result.Buckets || [],
      owner: result.Owner,
      continuationToken: result.ContinuationToken,
      aiExtractedParams: params,
      awsCommandParams: awsParams,
      totalBuckets: result.Buckets ? result.Buckets.length : 0,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ AWS Error: ${error.message}`,
      errorDetails: {
        errorCode: error.name,
        errorMessage: error.message,
        aiExtractedParams: params,
        awsCommandParams: awsParams,
      },
    };
  }
}

module.exports = listBuckets;
