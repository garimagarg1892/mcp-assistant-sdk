// tools/readFile.js - Read file content with automatic type detection
const fileSystem = require("../utils/fileSystem");

async function readFile(params) {
  console.log("🔍 Reading file:", JSON.stringify(params, null, 2));

  // Validate required parameter
  if (!params.filePath) {
    return {
      success: false,
      message: "Error: filePath is required. Please provide a file path.",
      receivedParams: params,
    };
  }

  try {
    const result = await fileSystem.readFile(params.filePath);

    if (result.success) {
      return {
        success: true,
        message: `✅ File "${result.fileName}" read successfully!`,
        fileInfo: {
          fileName: result.fileName,
          filePath: result.filePath,
          contentType: result.contentType,
          fileSize: result.fileSize,
          isBinary: result.isBinary,
          extension: result.extension,
          lastModified: result.lastModified,
          encoding: result.encoding,
        },
        content: result.content,
        // Truncate content preview for large files
        contentPreview:
          result.content.length > 500
            ? result.content.substring(0, 500) + "...[truncated]"
            : result.content,
      };
    } else {
      return {
        success: false,
        message: `❌ Error reading file: ${result.error}`,
        filePath: params.filePath,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Unexpected error: ${error.message}`,
      filePath: params.filePath,
    };
  }
}

module.exports = readFile;
