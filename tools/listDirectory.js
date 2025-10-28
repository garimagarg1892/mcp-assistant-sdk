// tools/listDirectory.js - List directory contents with filtering options
const fileSystem = require("../utils/fileSystem");

async function listDirectory(params) {
  console.log("🔍 Listing directory:", JSON.stringify(params, null, 2));

  // Validate required parameter
  if (!params.directoryPath) {
    return {
      success: false,
      message:
        "Error: directoryPath is required. Please provide a directory path.",
      receivedParams: params,
    };
  }

  // Extract options from parameters
  const options = {
    showHidden: params.showHidden || false,
    filesOnly: params.filesOnly || false,
    dirsOnly: params.dirsOnly || false,
    recursive: params.recursive || false,
    maxDepth: params.maxDepth || 3,
  };

  try {
    const result = await fileSystem.listDirectory(
      params.directoryPath,
      options
    );

    if (result.success) {
      return {
        success: true,
        message: `✅ Directory "${result.path}" listed successfully!`,
        directoryInfo: {
          path: result.path,
          totalItems: result.totalItems,
          directories: result.directories,
          files: result.files,
        },
        contents: result.contents,
        options: options,
      };
    } else {
      return {
        success: false,
        message: `❌ Error listing directory: ${result.error}`,
        directoryPath: params.directoryPath,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Unexpected error: ${error.message}`,
      directoryPath: params.directoryPath,
    };
  }
}

module.exports = listDirectory;
