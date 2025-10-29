// tools/scrapeWebsiteToFile.js - Scrape website, save to file, then upload to S3
const https = require("https");
const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const putObject = require("./putObject");

/**
 * Scrape a website and save content to a local file, then upload to S3
 * @param {Object} params - Parameters
 * @param {string} params.url - Website URL to scrape
 * @param {string} params.bucketName - Target S3 bucket name
 * @param {string} params.localFilePath - Local file path to save scraped content
 * @param {string} params.s3Key - Optional S3 key (default: filename from localFilePath)
 * @param {boolean} params.keepLocalFile - Keep local file after upload (default: false)
 * @param {Object} params.requestHeaders - Optional HTTP headers for scraping
 * @param {string} params.contentType - Optional content type for S3 upload
 * @returns {Object} - Result object
 */
async function scrapeWebsiteToFile(params) {
  console.log(
    "🕷️  Website Scraper - Received parameters:",
    JSON.stringify(params, null, 2)
  );

  // Validate required parameters
  if (!params.url) {
    return {
      success: false,
      message: "Error: url is required.",
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

  if (!params.localFilePath) {
    return {
      success: false,
      message: "Error: localFilePath is required to save scraped content.",
      receivedParams: params,
    };
  }

  try {
    // Step 1: Scrape the website
    console.log(`🌐 Scraping website: ${params.url}`);
    const scrapedContent = await scrapeWebsite(
      params.url,
      params.requestHeaders
    );

    if (!scrapedContent.success) {
      return {
        success: false,
        message: `❌ Failed to scrape website: ${scrapedContent.error}`,
        url: params.url,
      };
    }

    // Step 2: Save to local file
    console.log(`💾 Saving content to local file: ${params.localFilePath}`);
    const saveResult = await saveToFile(
      params.localFilePath,
      scrapedContent.content
    );

    if (!saveResult.success) {
      return {
        success: false,
        message: `❌ Failed to save to local file: ${saveResult.error}`,
        localFilePath: params.localFilePath,
      };
    }

    // Step 3: Upload to S3
    console.log(`☁️  Uploading to S3 bucket: ${params.bucketName}`);
    const s3Key = params.s3Key || path.basename(params.localFilePath);

    const uploadParams = {
      bucketName: params.bucketName,
      filePath: params.localFilePath,
      s3Key: s3Key,
      contentType: params.contentType || scrapedContent.contentType,
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

    // Step 4: Optionally delete local file
    if (!params.keepLocalFile) {
      console.log(`🗑️  Cleaning up local file: ${params.localFilePath}`);
      await fs.unlink(params.localFilePath).catch((err) => {
        console.warn(`⚠️  Could not delete local file: ${err.message}`);
      });
    }

    return {
      success: true,
      message: `✅ Successfully scraped website, saved to file, and uploaded to S3!`,
      scrapeInfo: {
        url: params.url,
        contentLength: scrapedContent.contentLength,
        contentType: scrapedContent.contentType,
        statusCode: scrapedContent.statusCode,
      },
      fileInfo: {
        localFilePath: params.localFilePath,
        fileSize: saveResult.fileSize,
        keepLocalFile: params.keepLocalFile || false,
      },
      uploadInfo: {
        bucketName: params.bucketName,
        s3Key: s3Key,
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
 * Scrape website content
 * @param {string} url - Website URL
 * @param {Object} headers - Optional HTTP headers
 * @returns {Object} - Scraped content
 */
function scrapeWebsite(url, headers = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === "https:" ? https : http;

      const defaultHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      };

      const requestOptions = {
        headers: { ...defaultHeaders, ...headers },
        timeout: 30000, // 30 seconds timeout
      };

      const request = client.get(url, requestOptions, (response) => {
        // Handle redirects
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          console.log(`↪️  Following redirect to: ${response.headers.location}`);
          return scrapeWebsite(response.headers.location, headers)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return resolve({
            success: false,
            error: `HTTP ${response.statusCode}: ${response.statusMessage}`,
            statusCode: response.statusCode,
          });
        }

        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          resolve({
            success: true,
            content: data,
            contentLength: data.length,
            contentType: response.headers["content-type"] || "text/html",
            statusCode: response.statusCode,
          });
        });
      });

      request.on("error", (error) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      request.on("timeout", () => {
        request.destroy();
        resolve({
          success: false,
          error: "Request timeout (30s)",
        });
      });
    } catch (error) {
      resolve({
        success: false,
        error: error.message,
      });
    }
  });
}

/**
 * Save content to local file
 * @param {string} filePath - File path
 * @param {string} content - Content to save
 * @returns {Object} - Save result
 */
async function saveToFile(filePath, content) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, "utf8");

    // Get file stats
    const stats = await fs.stat(filePath);

    return {
      success: true,
      filePath: filePath,
      fileSize: stats.size,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = scrapeWebsiteToFile;

