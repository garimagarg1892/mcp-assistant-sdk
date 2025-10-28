// tools/getObject.js - Smart Parameter Mapping with Text/Binary Detection
const { s3Client } = require("../utils/s3Client");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const parameterMapper = require("../utils/parameterMapper");
const path = require("path");

async function getObject(params) {
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

  // Use smart parameter mapper for AWS SDK compliance
  const commandParams = parameterMapper.mapParameters(params);

  console.log("📤 Sending to AWS S3:", JSON.stringify(commandParams, null, 2));

  const command = new GetObjectCommand(commandParams);

  try {
    const result = await s3Client.send(command);

    // Read the stream into a buffer
    const streamToBuffer = async (stream) => {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });
    };

    const bodyBuffer = await streamToBuffer(result.Body);

    // Determine file type based on contentType and file extension
    const contentType = result.ContentType || "";
    const fileExtension = path.extname(params.fileName).toLowerCase();
    const fileType = determineFileType(contentType, fileExtension);

    // Convert content based on type
    let fileContent, encoding, readableContent, analysisNote, isAnalyzable;
    
    switch (fileType) {
      case "text":
        // Text files (CSV, JSON, TXT, logs, code): Return as UTF-8 for direct AI analysis
        fileContent = bodyBuffer.toString("utf8");
        encoding = "utf8";
        // Provide truncated preview for large files
        readableContent = fileContent.length > 50000 
          ? fileContent.substring(0, 50000) + "\n\n...[Content truncated. Full content available. Total size: " + fileContent.length + " bytes]"
          : fileContent;
        analysisNote = "📄 Text content available. AI can directly read, analyze, summarize, and answer questions about this content.";
        isAnalyzable = true;
        console.log(`📄 Text file detected: ${params.fileName} (${bodyBuffer.length} bytes)`);
        break;
        
      case "image":
        // Image files (JPG, PNG, GIF, WEBP): Return as base64 for AI vision analysis
        fileContent = bodyBuffer.toString("base64");
        encoding = "base64";
        readableContent = `[Image data: ${params.fileName} - ${bodyBuffer.length} bytes]`;
        analysisNote = "🖼️ Image content available. AI can analyze visual content, describe what's in the image, read text from images, and answer questions about the image.";
        isAnalyzable = true;
        console.log(`🖼️ Image file detected: ${params.fileName} (${bodyBuffer.length} bytes)`);
        break;
        
      case "document":
        // Document files (PDF, DOCX, XLSX): Return as base64 with note about parsing
        fileContent = bodyBuffer.toString("base64");
        encoding = "base64";
        readableContent = `[Document data: ${params.fileName} - ${bodyBuffer.length} bytes]`;
        analysisNote = `📊 Document file detected (${fileExtension}). Content extraction libraries may be needed for detailed text analysis. The AI can provide metadata and general information, but full content parsing requires additional tools.`;
        isAnalyzable = "limited";
        console.log(`📊 Document file detected: ${params.fileName} (${bodyBuffer.length} bytes)`);
        break;
        
      default:
        // Other binary files: Return as base64
        fileContent = bodyBuffer.toString("base64");
        encoding = "base64";
        readableContent = `[Binary data: ${params.fileName} - ${bodyBuffer.length} bytes]`;
        analysisNote = "💾 Binary file. Specialized parsing or tools required for content analysis.";
        isAnalyzable = false;
        console.log(`💾 Binary file detected: ${params.fileName} (${bodyBuffer.length} bytes)`);
    }

    return {
      success: true,
      message: `✅ File "${params.fileName}" downloaded from bucket "${params.bucketName}" successfully!`,
      fileName: params.fileName,
      fileType: fileType,
      fileContent: fileContent,
      encoding: encoding,
      fileSize: bodyBuffer.length,
      isAnalyzable: isAnalyzable,
      analysisNote: analysisNote,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag,
      // Include readable content or preview for AI analysis
      ...(readableContent && { readableContent: readableContent }),
      aiExtractedParams: params,
      awsCommandParams: commandParams,
      awsResponse: {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata,
        serverSideEncryption: result.ServerSideEncryption,
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

/**
 * Determine file type based on content type and file extension
 * @param {string} contentType - MIME type from S3
 * @param {string} fileExtension - File extension
 * @returns {string} - "text", "image", "document", or "binary"
 */
function determineFileType(contentType, fileExtension) {
  const lowerContentType = contentType.toLowerCase();
  const lowerExtension = fileExtension.toLowerCase();

  // TEXT FILES - Directly readable by AI
  const textContentTypes = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-yaml",
    "application/yaml",
    "application/sql",
    "application/x-sh",
  ];

  const textExtensions = [
    ".txt", ".csv", ".tsv", ".json", ".xml", ".html", ".htm", ".css", 
    ".js", ".ts", ".jsx", ".tsx", ".vue", ".svelte",
    ".md", ".markdown", ".rst", ".yaml", ".yml", ".toml",
    ".log", ".sql", ".sh", ".bash", ".zsh", ".fish",
    ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".go", ".rs", 
    ".rb", ".php", ".pl", ".r", ".m", ".swift", ".kt", ".scala",
    ".env", ".config", ".conf", ".cfg", ".ini", ".properties",
    ".gitignore", ".dockerfile", ".editorconfig", ".htaccess",
    ".bat", ".cmd", ".ps1", ".awk", ".sed", ".vim",
  ];

  // IMAGE FILES - Analyzable by AI vision
  const imageContentTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/gif", 
    "image/webp", "image/svg+xml", "image/bmp",
  ];

  const imageExtensions = [
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
  ];

  // DOCUMENT FILES - May need extraction libraries
  const documentContentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];

  const documentExtensions = [
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".rtf",
  ];

  // Check TEXT files
  if (textContentTypes.some(type => lowerContentType.startsWith(type)) || 
      textExtensions.includes(lowerExtension)) {
    return "text";
  }

  // Check IMAGE files
  if (imageContentTypes.includes(lowerContentType) || 
      imageExtensions.includes(lowerExtension)) {
    return "image";
  }

  // Check DOCUMENT files
  if (documentContentTypes.includes(lowerContentType) || 
      documentExtensions.includes(lowerExtension)) {
    return "document";
  }

  // Default to binary
  return "binary";
}

module.exports = getObject;
