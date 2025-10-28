// utils/fileSystem.js - File System Utilities for MCP Assistant
const fs = require("fs").promises;
const path = require("path");

class FileSystemUtils {
  /**
   * Read file content with automatic type detection
   * @param {string} filePath - Path to the file
   * @returns {Object} - File content and metadata
   */
  async readFile(filePath) {
    try {
      // Check if file exists
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error(`Path "${filePath}" is not a file`);
      }

      // Get file extension and determine type
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const fileSize = stats.size;

      // Determine if file is binary or text
      const binaryExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".svg",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".zip",
        ".rar",
        ".tar",
        ".gz",
        ".7z",
        ".mp3",
        ".wav",
        ".mp4",
        ".avi",
        ".mov",
        ".exe",
        ".bin",
        ".dll",
        ".so",
      ];

      const isBinary = binaryExtensions.includes(ext);

      // Read file content
      let content;
      let contentType;

      if (isBinary) {
        // Read as buffer and convert to base64
        const buffer = await fs.readFile(filePath);
        content = buffer.toString("base64");
        contentType = this.getContentType(ext);
      } else {
        // Read as text
        content = await fs.readFile(filePath, "utf8");
        contentType = this.getContentType(ext) || "text/plain";
      }

      return {
        success: true,
        fileName,
        filePath,
        content,
        contentType,
        fileSize,
        isBinary,
        extension: ext,
        lastModified: stats.mtime,
        encoding: isBinary ? "base64" : "utf8",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath,
      };
    }
  }

  /**
   * List directory contents with file details
   * @param {string} dirPath - Path to directory
   * @param {Object} options - Listing options
   * @returns {Object} - Directory contents
   */
  async listDirectory(dirPath, options = {}) {
    try {
      const {
        showHidden = false,
        filesOnly = false,
        dirsOnly = false,
        recursive = false,
        maxDepth = 3,
      } = options;

      // Check if directory exists
      const stats = await fs.stat(dirPath);

      if (!stats.isDirectory()) {
        throw new Error(`Path "${dirPath}" is not a directory`);
      }

      const items = await fs.readdir(dirPath);
      const contents = [];

      for (const item of items) {
        // Skip hidden files if not requested
        if (!showHidden && item.startsWith(".")) {
          continue;
        }

        const itemPath = path.join(dirPath, item);
        const itemStats = await fs.stat(itemPath);

        const itemInfo = {
          name: item,
          path: itemPath,
          isDirectory: itemStats.isDirectory(),
          isFile: itemStats.isFile(),
          size: itemStats.size,
          lastModified: itemStats.mtime,
          extension: itemStats.isFile() ? path.extname(item) : null,
        };

        // Apply filters
        if (filesOnly && !itemInfo.isFile) continue;
        if (dirsOnly && !itemInfo.isDirectory) continue;

        contents.push(itemInfo);

        // Recursive listing for directories
        if (recursive && itemInfo.isDirectory && maxDepth > 0) {
          const subContents = await this.listDirectory(itemPath, {
            ...options,
            maxDepth: maxDepth - 1,
          });
          if (subContents.success) {
            itemInfo.contents = subContents.contents;
          }
        }
      }

      // Sort: directories first, then files
      contents.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        path: dirPath,
        totalItems: contents.length,
        directories: contents.filter((item) => item.isDirectory).length,
        files: contents.filter((item) => item.isFile).length,
        contents,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: dirPath,
      };
    }
  }

  /**
   * Get MIME content type from file extension
   * @param {string} ext - File extension
   * @returns {string} - MIME type
   */
  getContentType(ext) {
    const contentTypes = {
      // Text
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".md": "text/markdown",

      // Images
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".bmp": "image/bmp",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",

      // Documents
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      // Archives
      ".zip": "application/zip",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",

      // Audio/Video
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".mp4": "video/mp4",
      ".avi": "video/x-msvideo",
    };

    return contentTypes[ext] || "application/octet-stream";
  }

  /**
   * Get all files in directory recursively (for batch upload)
   * @param {string} dirPath - Directory path
   * @param {Array} extensions - Filter by extensions (optional)
   * @returns {Array} - List of file paths
   */
  async getAllFiles(dirPath, extensions = []) {
    try {
      const result = await this.listDirectory(dirPath, { recursive: true });
      if (!result.success) return [];

      const files = [];

      const extractFiles = (items) => {
        for (const item of items) {
          if (item.isFile) {
            // Filter by extensions if provided
            if (
              extensions.length === 0 ||
              extensions.includes(item.extension)
            ) {
              files.push(item.path);
            }
          }
          if (item.contents) {
            extractFiles(item.contents);
          }
        }
      };

      extractFiles(result.contents);
      return files;
    } catch (error) {
      console.error("Error getting all files:", error);
      return [];
    }
  }
}

module.exports = new FileSystemUtils();
