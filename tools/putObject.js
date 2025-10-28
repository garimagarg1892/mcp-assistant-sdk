// tools/putObject.js - Universal Upload Tool (Handles Everything!)
const { s3Client } = require("../utils/s3Client");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");
const fileSystem = require("../utils/fileSystem");
const path = require("path");

async function putObject(params) {
  console.log(
    "🔍 Universal Upload - Received parameters:",
    JSON.stringify(params, null, 2)
  );

  // Validate required bucket name
  if (!params.bucketName) {
    return {
      success: false,
      message: "Error: bucketName is required.",
      receivedParams: params,
    };
  }

  // SCENARIO 1: Direct content upload (original behavior)
  if (params.fileContent && params.fileName) {
    return await uploadDirectContent(params);
  }

  // SCENARIO 2: Single file upload by path
  if (params.filePath) {
    return await uploadSingleFile(params);
  }

  // SCENARIO 3: Directory upload (batch)
  if (params.directoryPath) {
    return await uploadDirectory(params);
  }

  // No valid input provided
  return {
    success: false,
    message:
      "Error: Provide either fileContent+fileName, filePath, or directoryPath.",
    receivedParams: params,
  };
}

// SCENARIO 1: Upload content directly (original putObject behavior)
async function uploadDirectContent(params) {
  console.log("📤 Direct content upload mode");

  try {
    const commandParams = parameterMapper.mapParameters(params);
    const command = new PutObjectCommand(commandParams);
    const result = await s3Client.send(command);

    return {
      success: true,
      message: `✅ File "${params.fileName}" uploaded to bucket "${params.bucketName}" successfully!`,
      uploadMode: "direct_content",
      uploadInfo: {
        bucketName: params.bucketName,
        fileName: params.fileName,
        contentSize: params.fileContent.length,
      },
      awsResponse: {
        etag: result.ETag,
        location: result.Location,
        metadata: result.$metadata,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Direct upload error: ${error.message}`,
      uploadMode: "direct_content",
      errorDetails: { errorCode: error.name, errorMessage: error.message },
    };
  }
}

// SCENARIO 2: Upload single file by path
async function uploadSingleFile(params) {
  console.log("📁 Single file upload mode");

  try {
    // Read the file
    const fileResult = await fileSystem.readFile(params.filePath);
    if (!fileResult.success) {
      return {
        success: false,
        message: `❌ Error reading file: ${fileResult.error}`,
        uploadMode: "single_file",
        filePath: params.filePath,
      };
    }

    // Determine S3 key
    const s3Key =
      params.s3Key || params.fileName || path.basename(params.filePath);

    // Prepare upload parameters
    const uploadParams = {
      bucketName: params.bucketName,
      fileName: s3Key,
      fileContent: fileResult.content,
      contentType: fileResult.contentType,
      // Pass through any additional S3 parameters
      ...params,
    };

    // Remove file system specific params
    delete uploadParams.filePath;
    delete uploadParams.s3Key;

    // Map and upload
    const commandParams = parameterMapper.mapParameters(uploadParams);

    // Handle binary content
    if (fileResult.isBinary) {
      commandParams.Body = Buffer.from(fileResult.content, "base64");
    } else {
      commandParams.Body = fileResult.content;
    }

    const command = new PutObjectCommand(commandParams);
    const result = await s3Client.send(command);

    return {
      success: true,
      message: `✅ File "${fileResult.fileName}" uploaded to bucket "${params.bucketName}" successfully!`,
      uploadMode: "single_file",
      uploadInfo: {
        sourcePath: params.filePath,
        bucketName: params.bucketName,
        s3Key: s3Key,
        fileSize: fileResult.fileSize,
        contentType: fileResult.contentType,
        isBinary: fileResult.isBinary,
      },
      awsResponse: {
        etag: result.ETag,
        location: result.Location,
        metadata: result.$metadata,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Single file upload error: ${error.message}`,
      uploadMode: "single_file",
      errorDetails: { errorCode: error.name, errorMessage: error.message },
    };
  }
}

// SCENARIO 3: Upload entire directory
async function uploadDirectory(params) {
  console.log("📦 Directory upload mode");

  try {
    // Extract options
    const options = {
      preserveStructure: params.preserveStructure !== false,
      s3Prefix: params.s3Prefix || "",
      fileExtensions: params.fileExtensions || [],
      maxFiles: params.maxFiles || 100,
      excludeHidden: params.excludeHidden !== false,
    };

    // Get all files
    const allFiles = await fileSystem.getAllFiles(
      params.directoryPath,
      options.fileExtensions
    );
    if (allFiles.length === 0) {
      return {
        success: false,
        message: `❌ No files found in directory: ${params.directoryPath}`,
        uploadMode: "directory",
      };
    }

    // Apply file limit
    const filesToUpload = allFiles.slice(0, options.maxFiles);
    const results = { successful: [], failed: [], skipped: [] };

    console.log(`📤 Starting batch upload of ${filesToUpload.length} files...`);

    for (let i = 0; i < filesToUpload.length; i++) {
      const filePath = filesToUpload[i];

      try {
        const fileName = path.basename(filePath);

        // Skip hidden files if requested
        if (options.excludeHidden && fileName.startsWith(".")) {
          results.skipped.push({ filePath, reason: "Hidden file excluded" });
          continue;
        }

        // Determine S3 key
        let s3Key;
        if (options.preserveStructure) {
          const relativePath = path.relative(params.directoryPath, filePath);
          s3Key = options.s3Prefix
            ? `${options.s3Prefix}/${relativePath}`
            : relativePath;
        } else {
          s3Key = options.s3Prefix
            ? `${options.s3Prefix}/${fileName}`
            : fileName;
        }
        s3Key = s3Key.replace(/\\/g, "/"); // Normalize for S3

        // Upload individual file using single file logic
        const uploadResult = await uploadSingleFile({
          bucketName: params.bucketName,
          filePath: filePath,
          s3Key: s3Key,
          acl: params.acl,
          serverSideEncryption: params.serverSideEncryption,
          storageClass: params.storageClass,
          metadata: params.metadata,
        });

        if (uploadResult.success) {
          results.successful.push({
            filePath,
            s3Key,
            fileSize: uploadResult.uploadInfo.fileSize,
            contentType: uploadResult.uploadInfo.contentType,
          });
        } else {
          results.failed.push({
            filePath,
            s3Key,
            error: uploadResult.message,
          });
        }
      } catch (error) {
        results.failed.push({
          filePath,
          error: error.message,
        });
      }
    }

    // Summary
    const totalProcessed =
      results.successful.length +
      results.failed.length +
      results.skipped.length;
    const successRate =
      totalProcessed > 0
        ? ((results.successful.length / totalProcessed) * 100).toFixed(1)
        : 0;

    return {
      success: results.successful.length > 0,
      message: `📦 Directory upload completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.skipped.length} skipped`,
      uploadMode: "directory",
      uploadSummary: {
        directoryPath: params.directoryPath,
        bucketName: params.bucketName,
        totalFilesFound: allFiles.length,
        totalFilesProcessed: totalProcessed,
        successfulUploads: results.successful.length,
        failedUploads: results.failed.length,
        skippedFiles: results.skipped.length,
        successRate: `${successRate}%`,
      },
      results: results,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Directory upload error: ${error.message}`,
      uploadMode: "directory",
      errorDetails: { errorCode: error.name, errorMessage: error.message },
    };
  }
}

module.exports = putObject;
