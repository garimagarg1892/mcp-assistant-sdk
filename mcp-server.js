#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Import your existing tools
const createBucket = require("./tools/createBucket");
const deleteBucket = require("./tools/deleteBucket");
const listBuckets = require("./tools/listBuckets");
const putObject = require("./tools/putObject");
const getObject = require("./tools/getObject");
const deleteObject = require("./tools/deleteObject");

// Import new file system tools
const readFile = require("./tools/readFile");
const listDirectory = require("./tools/listDirectory");

// Import MySQL bridge tool
const exportTableToStorage = require("./tools/exportTableToStorage");

// Load environment variables
require("dotenv").config();

class S3MCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "mcp-s3-assistant",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_bucket",
            description: `Create an AWS S3 bucket with intelligent parameter extraction from natural language.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Analyze the user's request and extract relevant AWS S3 parameters. If the user doesn't provide a bucket name, ASK FOR IT.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- bucketName: ALWAYS REQUIRED - if not provided, ask the user for it

OPTIONAL PARAMETERS (extract if mentioned):

🔒 ACCESS CONTROL:
- acl: "private" | "public-read" | "public-read-write" | "authenticated-read"
  → Default: "private" (if no access mentioned)
  → From: "private", "public", "public read", "authenticated", "secure"

🌍 REGION MAPPING:
- locationConstraint: AWS region code
  → Default: "us-east-1" (if no region mentioned)
  → COMMON MAPPINGS:
    • "Europe", "EU", "Ireland" → "eu-west-1"
    • "London", "UK" → "eu-west-2" 
    • "Paris", "France" → "eu-west-3"
    • "Frankfurt", "Germany" → "eu-central-1"
    • "Virginia", "US East" → "us-east-1"
    • "Ohio", "US East 2" → "us-east-2"
    • "Oregon", "US West" → "us-west-2"
    • "California", "US West 1" → "us-west-1"
    • "Asia", "Singapore" → "ap-southeast-1"
    • "Tokyo", "Japan" → "ap-northeast-1"
    • "Sydney", "Australia" → "ap-southeast-2"
    • "Canada", "Toronto" → "ca-central-1"
  → If ambiguous (e.g., just "Asia"), ask for clarification

🔐 ADVANCED FEATURES:
- objectLockEnabledForBucket: true | false
  → From: "object lock", "versioning", "immutable", "compliance", "retention"
  
- objectOwnership: "BucketOwnerPreferred" | "ObjectWriter" | "BucketOwnerEnforced"
  → Default: "BucketOwnerEnforced"
  → From: "bucket owner", "writer owns", "enforced ownership"

🎯 EXAMPLES:
"Create a private bucket called 'data-backup'" → { bucketName: "data-backup", acl: "private" }
"Public bucket in Europe" → ASK for bucket name first
"Secure bucket in Tokyo with object lock" → { bucketName: "...", acl: "private", locationConstraint: "ap-northeast-1", objectLockEnabledForBucket: true }
"Create bucket in Asia" → ASK which specific Asian region

⚠️ ERROR HANDLING:
- If bucket name missing: "I need a bucket name. What would you like to call this bucket?"
- If region ambiguous: "Which specific region? Available options: [list relevant regions]"
- If request unclear: "Could you clarify [specific ambiguous part]?"

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                bucketName: {
                  type: "string",
                  description:
                    "Name of the S3 bucket to create (REQUIRED - ask user if not provided)",
                },
              },
              required: ["bucketName"],
              additionalProperties: true,
            },
          },
          {
            name: "delete_bucket",
            description: `Delete an AWS S3 bucket with intelligent parameter extraction from natural language.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Analyze the user's request and extract relevant AWS S3 parameters. If the user doesn't provide a bucket name, ASK FOR IT.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- bucketName: ALWAYS REQUIRED - if not provided, ask the user for it

⚠️ IMPORTANT NOTES:
- The bucket must be empty before it can be deleted
- This operation is irreversible
- All bucket policies, ACLs, and configurations will be permanently removed

🎯 EXAMPLES:
"Delete bucket 'old-data'" → { bucketName: "old-data" }
"Remove the test-bucket" → { bucketName: "test-bucket" }
"Delete my-bucket" → { bucketName: "my-bucket" }

⚠️ ERROR HANDLING:
- If bucket name missing: "I need a bucket name. Which bucket would you like to delete?"
- If bucket not empty: "The bucket must be empty before it can be deleted"
- If bucket doesn't exist: "The specified bucket does not exist"

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                bucketName: {
                  type: "string",
                  description:
                    "Name of the S3 bucket to delete (REQUIRED - ask user if not provided)",
                },
              },
              required: ["bucketName"],
              additionalProperties: true,
            },
          },
          {
            name: "list_buckets",
            description: `List S3 buckets with intelligent filtering and pagination.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract filtering and pagination parameters from natural language requests.

📋 PARAMETER MAPPING GUIDE:

OPTIONAL PARAMETERS (extract if mentioned):

🔢 PAGINATION:
- maxBuckets: Integer (1-1000)
  → From: "first 10 buckets", "limit to 5", "show 20 buckets"
  → Default: All buckets if not specified

- continuationToken: String
  → From: "continue from token", "next page", pagination context
  → Used for paginated results

🔍 FILTERING:
- prefix: String  
  → From: "buckets starting with 'test'", "buckets beginning with 'prod'"
  → Limits response to bucket names that begin with specified prefix

- bucketRegion: String (AWS region code)
  → From: "buckets in Europe", "US buckets", "Asia buckets"
  → REGION MAPPINGS (same as createBucket):
    • "Europe", "EU" → "eu-west-1"
    • "Virginia", "US East" → "us-east-1" 
    • "Asia", "Singapore" → "ap-southeast-1"
    • "Tokyo", "Japan" → "ap-northeast-1"

🎯 EXAMPLES:
"List all buckets" → {} (no parameters)
"Show first 10 buckets" → { maxBuckets: 10 }
"List buckets starting with 'test'" → { prefix: "test" }
"Show buckets in Europe, limit 5" → { bucketRegion: "eu-west-1", maxBuckets: 5 }
"Buckets beginning with 'prod' in Asia" → { prefix: "prod", bucketRegion: "ap-southeast-1" }

⚠️ ERROR HANDLING:
- If region ambiguous: "Which specific region? (eu-west-1, us-east-1, ap-southeast-1, etc.)"
- If maxBuckets invalid: "MaxBuckets must be between 1 and 1000"

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: true,
            },
          },
          {
            name: "put_object",
            description: `Universal upload tool - handles direct content, single files, or entire directories!

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract upload parameters from natural language requests. This tool handles 3 scenarios automatically.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- bucketName: String - Target bucket name

UPLOAD SCENARIOS (choose one):

🔸 SCENARIO 1: Direct Content Upload
- fileName: String - Object key/file name
- fileContent: String - Raw content (base64 for binary)

🔸 SCENARIO 2: Single File Upload  
- filePath: String - Path to local file to upload
- s3Key: String (optional) - Custom S3 object key

🔸 SCENARIO 3: Directory Upload (Batch)
- directoryPath: String - Path to directory to upload
- preserveStructure: Boolean - Keep folder structure (default: true)
- s3Prefix: String (optional) - Prefix for all objects
- fileExtensions: Array (optional) - Filter by extensions like [".jpg", ".pdf"]
- maxFiles: Integer (optional) - Limit files uploaded (default: 100)

OPTIONAL PARAMETERS (all scenarios):
- acl: "private" | "public-read" | "public-read-write" | "authenticated-read"
- serverSideEncryption: "AES256" | "aws:kms" | "aws:kms:dsse"
- storageClass: "STANDARD" | "STANDARD_IA" | "GLACIER" | "DEEP_ARCHIVE"
- contentType: String - MIME type (auto-detected for files)
- metadata: Object - Custom metadata key-value pairs

🎯 EXAMPLES:
"Upload hello.txt with content 'Hello World'" → { bucketName: "my-bucket", fileName: "hello.txt", fileContent: "Hello World" }
"Upload /home/user/photo.jpg to my-bucket" → { bucketName: "my-bucket", filePath: "/home/user/photo.jpg" }
"Upload entire photos directory with backup/ prefix" → { bucketName: "my-bucket", directoryPath: "/home/user/photos", s3Prefix: "backup" }
"Upload only PDFs from documents folder" → { bucketName: "my-bucket", directoryPath: "/home/user/docs", fileExtensions: [".pdf"] }

✨ SMART FEATURES:
- Automatic file type detection (binary vs text)
- Content-Type auto-detection from file extensions
- Directory structure preservation or flattening
- Batch upload progress tracking
- Comprehensive error handling

⚠️ ERROR HANDLING:
- Missing bucket: "bucketName is required"
- Invalid scenario: "Provide either fileContent+fileName, filePath, or directoryPath"
- File not found: Clear error with file path
- Batch failures: Detailed per-file error reporting

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                bucketName: {
                  type: "string",
                  description: "Target bucket name",
                },
                fileName: {
                  type: "string",
                  description: "Object key/file name (for direct content)",
                },
                fileContent: {
                  type: "string",
                  description: "File content (for direct content)",
                },
                filePath: {
                  type: "string",
                  description: "Local file path to upload",
                },
                directoryPath: {
                  type: "string",
                  description: "Local directory path to upload",
                },
                s3Key: { type: "string", description: "Custom S3 object key" },
                preserveStructure: {
                  type: "boolean",
                  description: "Keep directory structure in S3",
                },
                s3Prefix: {
                  type: "string",
                  description: "Prefix for uploaded objects",
                },
                fileExtensions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Filter by file extensions",
                },
                maxFiles: {
                  type: "integer",
                  description: "Maximum files to upload",
                },
              },
              required: ["bucketName"],
              additionalProperties: true,
            },
          },
          {
            name: "get_object",
            description: `Download an object from S3 bucket with advanced options.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract download parameters and conditions from natural language requests.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- bucketName: String - Source bucket name
- fileName: String - Object key/file name to download

OPTIONAL PARAMETERS (extract if mentioned):

🔄 CONDITIONAL DOWNLOADS:
- ifMatch: String (ETag)
  → From: "if ETag matches", "only if unchanged"
  
- ifModifiedSince: Date
  → From: "if modified since", "updated after", "newer than"
  
- ifNoneMatch: String (ETag) 
  → From: "if different", "if changed", "if ETag differs"

📏 RANGE REQUESTS:
- range: String
  → From: "first 1000 bytes", "bytes 0-1023", "partial download"
  → Format: "bytes=0-1023"

🔐 ENCRYPTION:
- sseCustomerAlgorithm: String
  → From: "customer encryption", "SSE-C", "AES256"
  
- versionId: String
  → From: "specific version", "version ID", "historical version"

📋 RESPONSE MODIFICATION:
- responseCacheControl: String
  → From: "cache control", "no-cache", "max-age"
  
- responseContentType: String
  → From: "return as", "content type", "MIME type override"

🎯 EXAMPLES:
"Download file.txt from bucket" → { bucketName: "...", fileName: "file.txt" }
"Get first 1000 bytes of data.bin" → { ..., range: "bytes=0-999" }
"Download if modified since yesterday" → { ..., ifModifiedSince: "2024-01-01" }
"Get specific version of document" → { ..., versionId: "abc123" }

⚠️ ERROR HANDLING:
- Missing required params: "Need bucketName and fileName"
- Invalid range format: "Range must be 'bytes=start-end'"

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                bucketName: {
                  type: "string",
                  description: "Source bucket name",
                },
                fileName: {
                  type: "string",
                  description: "Object key/file name to download",
                },
              },
              required: ["bucketName", "fileName"],
              additionalProperties: true,
            },
          },
          {
            name: "read_file",
            description: `Read any file from the local file system with automatic type detection.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract file reading parameters from natural language requests.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- filePath: String - Path to the file to read

🎯 EXAMPLES:
"Read the file /home/user/document.pdf" → { filePath: "/home/user/document.pdf" }
          {
            name: "delete_object",
            description: `Delete an object from S3 bucket with versioning and governance support.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract deletion parameters from natural language requests.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- bucketName: String - Source bucket name
- fileName: String - Object key/file name to delete

OPTIONAL PARAMETERS (extract if mentioned):

🔄 VERSIONING:
- versionId: String
  → From: "specific version", "version ID", "delete version"
  → Permanently deletes a specific version

🔐 ADVANCED OPTIONS:
- mfa: String
  → From: "with MFA", "MFA delete"
  → Format: "serial-number token-code"
  → Required for MFA Delete enabled buckets

- bypassGovernanceRetention: Boolean
  → From: "bypass governance", "override retention"
  → Requires s3:BypassGovernanceRetention permission

- requestPayer: String
  → From: "requester pays"
  → Possible values: "requester"

- expectedBucketOwner: String
  → From: "expected owner", "account ID"
  → Account ID validation

🎯 EXAMPLES:
"Delete file.txt from bucket" → { bucketName: "...", fileName: "file.txt" }
"Delete specific version of document" → { ..., versionId: "abc123" }
"Delete with MFA" → { ..., mfa: "serial-number token" }
"Delete bypassing governance" → { ..., bypassGovernanceRetention: true }

⚠️ IMPORTANT NOTES:
- S3 delete is idempotent - success doesn't guarantee object existed
- Versioned buckets create delete markers instead of permanent deletion
- Use versionId to permanently delete a specific version
- MFA delete requires HTTPS and proper MFA configuration

🛡️ PERMISSIONS REQUIRED:
- s3:DeleteObject - Standard delete permission
- s3:DeleteObjectVersion - For deleting specific versions
- s3:BypassGovernanceRetention - For bypassing governance mode

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                bucketName: {
                  type: "string",
                  description: "Source bucket name",
                },
                fileName: {
                  type: "string",
                  description: "Object key/file name to delete",
                },
                versionId: {
                  type: "string",
                  description: "Specific version ID to delete",
                },
                mfa: {
                  type: "string",
                  description: "MFA authentication (serial-number token-code)",
                },
                bypassGovernanceRetention: {
                  type: "boolean",
                  description: "Bypass governance retention mode",
                },
              },
              required: ["bucketName", "fileName"],
              additionalProperties: true,
            },
          },
"Show me the contents of config.json" → { filePath: "config.json" }
"What's in that image file?" → { filePath: "image.jpg" }

✨ FEATURES:
- Automatic binary/text detection
- Proper encoding handling (base64 for binary, utf8 for text)
- Content type detection from file extension
- File metadata (size, modified date, etc.)
- Support for all file types (images, documents, code, etc.)

⚠️ ERROR HANDLING:
- File not found: Clear error message with file path
- Permission denied: Helpful access error information
- Invalid path: Path validation and suggestions`,
            inputSchema: {
              type: "object",
              properties: {
                filePath: {
                  type: "string",
                  description: "Path to the file to read",
                },
              },
              required: ["filePath"],
              additionalProperties: true,
            },
          },
          {
            name: "list_directory",
            description: `List contents of a directory with filtering and browsing options.

🧠 PARAMETER EXTRACTION INTELLIGENCE:
Extract directory listing parameters from natural language requests.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- directoryPath: String - Path to the directory to list

OPTIONAL PARAMETERS:
- showHidden: Boolean - Show hidden files/folders (default: false)
- filesOnly: Boolean - Show only files (default: false)
- dirsOnly: Boolean - Show only directories (default: false)
- recursive: Boolean - Recursive listing (default: false)
- maxDepth: Integer - Maximum depth for recursive listing (default: 3)

🎯 EXAMPLES:
"List files in /home/user/documents" → { directoryPath: "/home/user/documents" }
"Show all files including hidden ones" → { directoryPath: ".", showHidden: true }
"List only directories recursively" → { directoryPath: "/path", dirsOnly: true, recursive: true }
"Browse folder structure 2 levels deep" → { directoryPath: "/path", recursive: true, maxDepth: 2 }

✨ FEATURES:
- File and directory information (size, modified date, type)
- Filtering options (files only, directories only, hidden files)
- Recursive directory traversal
- Sorted output (directories first, then files)
- File extension detection

⚠️ ERROR HANDLING:
- Directory not found: Clear error with path
- Permission denied: Access error information
- Invalid path: Path validation`,
            inputSchema: {
              type: "object",
              properties: {
                directoryPath: {
                  type: "string",
                  description: "Path to the directory to list",
                },
                showHidden: {
                  type: "boolean",
                  description: "Show hidden files and folders",
                },
                filesOnly: { type: "boolean", description: "Show only files" },
                dirsOnly: {
                  type: "boolean",
                  description: "Show only directories",
                },
                recursive: { type: "boolean", description: "List recursively" },
                maxDepth: {
                  type: "integer",
                  description: "Maximum depth for recursive listing",
                },
              },
              required: ["directoryPath"],
              additionalProperties: true,
            },
          },
          {
            name: "export_table_to_storage",
            description: `Export MySQL table data to S3/ObjectStore via MCP bridge.

🌉 MCP BRIDGE INTELLIGENCE:
This tool connects MySQL MCP with your S3 MCP to create a seamless data pipeline.

📋 PARAMETER MAPPING GUIDE:

REQUIRED:
- tableName: String - Name of the MySQL table to export
- bucketName: String - Target S3 bucket name

MYSQL CONNECTION (optional - uses env vars if not provided):
- mysqlHost: String - MySQL server host (default: localhost)
- mysqlPort: Integer - MySQL server port (default: 3306)  
- mysqlUser: String - MySQL username (default: root)
- mysqlPassword: String - MySQL password
- mysqlDatabase: String - MySQL database name

QUERY OPTIONS (optional):
- where: String - WHERE clause for filtering data
- orderBy: String - ORDER BY clause for sorting
- limit: Integer - LIMIT number of records

OUTPUT OPTIONS (optional):
- format: "json" | "csv" | "jsonl" (default: json)
- fileName: String - Custom output filename
- prettyFormat: Boolean - Pretty print JSON (default: true)
- csvDelimiter: String - CSV delimiter (default: comma)

S3 OPTIONS (optional - same as putObject):
- s3Prefix: String - S3 object prefix
- acl: String - S3 access control
- serverSideEncryption: String - Encryption type
- storageClass: String - S3 storage class
- metadata: Object - Custom metadata

🎯 EXAMPLES:
"Export users table to my-bucket" → { tableName: "users", bucketName: "my-bucket" }
"Export products as CSV to backup-bucket" → { tableName: "products", bucketName: "backup-bucket", format: "csv" }
"Export recent orders to archive" → { tableName: "orders", bucketName: "archive", where: "created_date > '2024-01-01'" }

✨ FEATURES:
- Automatic MySQL MCP communication
- Multiple export formats (JSON, CSV, JSONL)
- Query filtering and sorting
- Seamless S3 upload via existing putObject
- Comprehensive metadata tracking

⚠️ REQUIREMENTS:
- MySQL MCP server must be installed and accessible
- Valid MySQL connection parameters (via env or params)
- Target S3 bucket must exist

Pass all extracted parameters as a flat object.`,
            inputSchema: {
              type: "object",
              properties: {
                tableName: {
                  type: "string",
                  description: "MySQL table name to export",
                },
                bucketName: {
                  type: "string",
                  description: "Target S3 bucket name",
                },
                mysqlHost: { type: "string", description: "MySQL server host" },
                mysqlPort: {
                  type: "integer",
                  description: "MySQL server port",
                },
                mysqlUser: { type: "string", description: "MySQL username" },
                mysqlPassword: {
                  type: "string",
                  description: "MySQL password",
                },
                mysqlDatabase: {
                  type: "string",
                  description: "MySQL database name",
                },
                where: {
                  type: "string",
                  description: "WHERE clause for filtering",
                },
                orderBy: { type: "string", description: "ORDER BY clause" },
                limit: {
                  type: "integer",
                  description: "LIMIT number of records",
                },
                format: {
                  type: "string",
                  description: "Output format (json, csv, jsonl)",
                },
                fileName: {
                  type: "string",
                  description: "Custom output filename",
                },
                s3Prefix: { type: "string", description: "S3 object prefix" },
              },
              required: ["tableName", "bucketName"],
              additionalProperties: true,
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case "create_bucket":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await createBucket(args);
            break;

          case "delete_bucket":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await deleteBucket(args);
            break;

          case "list_buckets":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await listBuckets(args);
            break;

          case "put_object":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await putObject(args);
            break;

          case "get_object":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await getObject(args);
            break;


          case "delete_object":
            // Pass ALL arguments directly to the tool - truly generic!
            result = await deleteObject(args);
            break;
          case "read_file":
            // File system tool - read any file type
            result = await readFile(args);
            break;

          case "list_directory":
            // File system tool - browse directories
            result = await listDirectory(args);
            break;

          case "export_table_to_storage":
            // MySQL MCP bridge tool - export table data to S3
            result = await exportTableToStorage(args);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Server Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP S3 Assistant Server running on stdio");
  }
}

// Start the server
if (require.main === module) {
  const server = new S3MCPServer();
  server.run().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = S3MCPServer;
