// tools/deleteObject.js - Smart Parameter Mapping
const { s3Client } = require("../utils/s3Client");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");

async function deleteObject(params) {
  console.log(
    "🔍 Received parameters from AI:",
    JSON.stringify(params, null, 2)
  );

  // Validate required parameters
  if (!params.bucketName || !params.fileName) {
    return {
      success: false,
      message: "Error: bucketName and fileName are required.",
      receivedParams: params,
    };
  }

  // Warning for destructive operations
  if (params.bypassGovernanceRetention) {
    console.warn(
      "⚠️  WARNING: Bypassing governance retention - this is a privileged operation"
    );
  }

  // Use smart parameter mapper for AWS SDK compliance
  const commandParams = parameterMapper.mapParameters(params);

  console.log("📤 Sending to AWS S3:", JSON.stringify(commandParams, null, 2));

  const command = new DeleteObjectCommand(commandParams);

  try {
    const result = await s3Client.send(command);

    // S3 DeleteObject is idempotent - it returns success even if object doesn't exist
    const wasDeleted =
      result.DeleteMarker !== undefined || result.VersionId !== undefined;

    // Build deletion status message
    let statusMessage = "";
    if (result.DeleteMarker) {
      statusMessage = "Delete marker created (object is in versioned bucket)";
    } else if (result.VersionId) {
      statusMessage = `Version ${result.VersionId} deleted permanently`;
    } else {
      statusMessage = "Delete request completed successfully";
    }

    return {
      success: true,
      message: `✅ File "${params.fileName}" deleted from bucket "${params.bucketName}" successfully!`,
      fileName: params.fileName,
      bucketName: params.bucketName,
      aiExtractedParams: params,
      awsCommandParams: commandParams,
      deletionDetails: {
        status: statusMessage,
        deleteMarker: result.DeleteMarker,
        versionId: result.VersionId,
        requestCharged: result.RequestCharged,
        operationType: result.DeleteMarker
          ? "versioned_delete"
          : result.VersionId
          ? "permanent_version_delete"
          : "simple_delete",
        note: wasDeleted
          ? "Object was deleted"
          : "Delete request completed (object may not have existed)",
      },
      awsResponse: {
        metadata: result.$metadata,
      },
    };
  } catch (error) {
    // Enhanced error handling with specific hints
    let hint = "Check AWS credentials and permissions";
    let suggestion = "";

    switch (error.name) {
      case "NoSuchBucket":
        hint = `The bucket "${params.bucketName}" does not exist`;
        suggestion = "Verify bucket name and region configuration";
        break;
      case "AccessDenied":
        hint = "Access denied - insufficient permissions";
        if (params.versionId) {
          suggestion =
            "Deleting specific version requires s3:DeleteObjectVersion permission";
        } else if (params.bypassGovernanceRetention) {
          suggestion =
            "Bypassing governance requires s3:BypassGovernanceRetention permission";
        } else {
          suggestion =
            "Ensure IAM policy includes s3:DeleteObject permission";
        }
        break;
      case "InvalidArgument":
        hint = "Invalid argument provided";
        if (params.mfa) {
          suggestion = 'MFA delete format should be: "serial-number token-code"';
        } else {
          suggestion = "Check parameter format and values";
        }
        break;
      case "MethodNotAllowed":
        hint = "Delete operation not allowed";
        suggestion =
          "Object might be protected by Object Lock or bucket policy denies delete operations";
        break;
    }

    return {
      success: false,
      message: `❌ AWS Error: ${error.message}`,
      errorDetails: {
        errorCode: error.name,
        errorMessage: error.message,
        statusCode: error.$metadata?.httpStatusCode,
        aiExtractedParams: params,
        awsCommandParams: commandParams,
        hint: hint,
        suggestion: suggestion,
      },
    };
  }
}

module.exports = deleteObject;
