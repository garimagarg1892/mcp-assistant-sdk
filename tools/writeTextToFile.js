// tools/writeTextToFile.js - Write text to a local file, then upload to S3
const fs = require("fs").promises;
const path = require("path");
const putObject = require("./putObject");

/**
 * Write text content to a local file, then upload to S3
 * @param {Object} params - Parameters
 * @param {string} params.textContent - Text content to write
 * @param {string} params.localFilePath - Local file path to create/write
 * @param {string} params.bucketName - Target S3 bucket name
 * @param {string} params.s3Key - Optional S3 key (default: filename from localFilePath)
 * @param {boolean} params.keepLocalFile - Keep local file after upload (default: false)
 * @param {boolean} params.appendMode - Append to file instead of overwrite (default: false)
 * @param {string} params.encoding - File encoding (default: utf8)
 * @param {string} params.contentType - Optional content type for S3 upload
 * @returns {Object} - Result object
 */
async function writeTextToFile(params) {
  console.log(
    "📝 Write Text to File - Received parameters:",
    JSON.stringify(
      { ...params, textContent: `${params.textContent?.substring(0, 100)}...` },
      null,
      2
    )
  );

  // Validate required parameters
  if (params.textContent === undefined || params.textContent === null) {
    return {
      success: false,
      message: "Error: textContent is required.",
      receivedParams: params,
    };
  }

  if (!params.localFilePath) {
    return {
      success: false,
      message: "Error: localFilePath is required to save text content.",
      receivedParams: params,
    };
  }

  if (!params.bucketName) {
    return {
      success: false,
      message: "Error: bucketName is required.",
      receivedParams: params,
    };
  }

  try {
    // Step 1: Write text to local file
    console.log(`💾 Writing text to local file: ${params.localFilePath}`);
    const encoding = params.encoding || "utf8";
    const appendMode = params.appendMode || false;

    const writeResult = await writeTextFile(
      params.localFilePath,
      params.textContent,
      encoding,
      appendMode
    );

    if (!writeResult.success) {
      return {
        success: false,
        message: `❌ Failed to write to local file: ${writeResult.error}`,
        localFilePath: params.localFilePath,
      };
    }

    // Step 2: Upload to S3
    console.log(`☁️  Uploading to S3 bucket: ${params.bucketName}`);
    const s3Key = params.s3Key || path.basename(params.localFilePath);

    // Determine content type
    const ext = path.extname(params.localFilePath).toLowerCase();
    let contentType = params.contentType;
    if (!contentType) {
      const contentTypes = {
        ".txt": "text/plain",
        ".json": "application/json",
        ".xml": "application/xml",
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".md": "text/markdown",
        ".csv": "text/csv",
      };
      contentType = contentTypes[ext] || "text/plain";
    }

    const uploadParams = {
      bucketName: params.bucketName,
      filePath: params.localFilePath,
      s3Key: s3Key,
      contentType: contentType,
      // Pass through any additional S3 parameters
      acl: params.acl,
      serverSideEncryption: params.serverSideEncryption,
      storageClass: params.storageClass,
      metadata: params.metadata,
    };

    const uploadResult = await putObject(uploadParams);

    if (!uploadResult.success) {
      return {
        success: false,
        message: `❌ Failed to upload to S3: ${uploadResult.message}`,
        uploadResult: uploadResult,
      };
    }

    // Step 3: Optionally delete local file
    if (!params.keepLocalFile) {
      console.log(`🗑️  Cleaning up local file: ${params.localFilePath}`);
      await fs.unlink(params.localFilePath).catch((err) => {
        console.warn(`⚠️  Could not delete local file: ${err.message}`);
      });
    }

    return {
      success: true,
      message: `✅ Successfully wrote text to file and uploaded to S3!`,
      fileInfo: {
        localFilePath: params.localFilePath,
        fileSize: writeResult.fileSize,
        encoding: encoding,
        appendMode: appendMode,
        keepLocalFile: params.keepLocalFile || false,
        contentLength: params.textContent.length,
      },
      uploadInfo: {
        bucketName: params.bucketName,
        s3Key: s3Key,
        contentType: contentType,
        uploadMode: uploadResult.uploadMode,
      },
      awsResponse: uploadResult.awsResponse,
    };
  } catch (error) {
    return {
      success: false,
      message: `❌ Unexpected error: ${error.message}`,
      errorDetails: { errorCode: error.name, errorMessage: error.message },
    };
  }
}

/**
 * Write text content to a file
 * @param {string} filePath - File path
 * @param {string} content - Content to write
 * @param {string} encoding - File encoding
 * @param {boolean} append - Append mode
 * @returns {Object} - Write result
 */
async function writeTextFile(filePath, content, encoding = "utf8", append = false) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write or append to file
    if (append) {
      await fs.appendFile(filePath, content, encoding);
    } else {
      await fs.writeFile(filePath, content, encoding);
    }

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath: filePath,
      fileSize: stats.size,
      mode: append ? "append" : "write",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = writeTextToFile;

