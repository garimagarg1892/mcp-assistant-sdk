// tools/exportTableToStorage.js - Bridge MySQL MCP to S3 MCP
const { spawn } = require("child_process");
const putObject = require("./putObject");

async function exportTableToStorage(params) {
  console.log(
    "🌉 Bridge Tool - Received parameters:",
    JSON.stringify(params, null, 2)
  );

  // Validate required parameters
  if (!params.tableName) {
    return {
      success: false,
      message: "Error: tableName is required.",
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

  if (!params.mysqlDatabase) {
    return {
      success: false,
      message:
        "Error: mysqlDatabase is required. Specify which database to export from.",
      receivedParams: params,
    };
  }

  try {
    // Step 1: Get data from MySQL MCP
    console.log("📡 Connecting to MySQL MCP server...");
    const mysqlData = await queryMySQLMCP(params);

    if (!mysqlData.success) {
      return {
        success: false,
        message: `❌ MySQL MCP query failed: ${mysqlData.message}`,
        mysqlError: mysqlData,
      };
    }

    console.log(
      `📊 Retrieved ${mysqlData.rowCount} records from ${params.tableName}`
    );

    // Step 2: Format the data
    const format = params.format || "json";
    const formattedData = formatData(mysqlData.data, format, params);
    const fileName =
      params.fileName || generateFileName(params.tableName, format);

    console.log(
      `📝 Data formatted as ${format.toUpperCase()}. Size: ${formattedData.length} characters.`
    );

    // Step 3: Upload to S3 using existing putObject
    console.log("📤 Uploading to object storage via S3 MCP...");
    const uploadParams = {
      bucketName: params.bucketName,
      fileName: fileName,
      fileContent: formattedData,
      contentType: getContentType(format),

      // Pass through S3 options
      s3Prefix: params.s3Prefix,
      acl: params.acl,
      serverSideEncryption: params.serverSideEncryption,
      storageClass: params.storageClass,
      metadata: {
        ...params.metadata,
        source: "mysql-mcp-bridge",
        "table-name": params.tableName,
        "export-format": format,
        "record-count": mysqlData.rowCount.toString(),
        "export-timestamp": new Date().toISOString(),
      },
    };

    const uploadResult = await putObject(uploadParams);

    if (uploadResult.success) {
      return {
        success: true,
        message: `✅ Successfully exported ${params.tableName} to ${params.bucketName}!`,
        exportSummary: {
          source: "MySQL via MCP Bridge",
          tableName: params.tableName,
          recordCount: mysqlData.rowCount,
          format: format,
          fileSize: formattedData.length,
          fileName: fileName,
          bucketName: params.bucketName,
        },
        mysqlInfo: mysqlData.info,
        uploadInfo: uploadResult.uploadInfo,
        awsResponse: uploadResult.awsResponse,
      };
    } else {
      return {
        success: false,
        message: `❌ Export failed during S3 upload: ${uploadResult.message}`,
        exportData: {
          recordCount: mysqlData.rowCount,
          format: format,
          dataSize: formattedData.length,
        },
        uploadError: uploadResult,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Bridge tool error: ${error.message}`,
      errorDetails: { errorCode: error.name, errorMessage: error.message },
    };
  }
}

/**
 * Query MySQL MCP server via process communication
 */
async function queryMySQLMCP(params) {
  return new Promise((resolve, reject) => {
    console.log("🔌 Spawning MySQL MCP process...");

    // Spawn the MySQL MCP server process with proper working directory
    const mysqlProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: "/home/garima.garg/mcp-server-mysql",
      env: {
        ...process.env,
        MYSQL_HOST: params.mysqlHost || "localhost",
        MYSQL_PORT: params.mysqlPort || "3306",
        MYSQL_USER: params.mysqlUser || "root",
        MYSQL_PASS: params.mysqlPassword || "MySecurePassword123!",
        MYSQL_DB: "", // Multi-DB mode
        ALLOW_INSERT_OPERATION: "false",
        ALLOW_UPDATE_OPERATION: "false",
        ALLOW_DELETE_OPERATION: "false",
      },
    });

    let responseData = "";
    let errorData = "";

    // Handle process output
    mysqlProcess.stdout.on("data", (data) => {
      responseData += data.toString();
      // Kill process after receiving response to prevent hanging
      setTimeout(() => mysqlProcess.kill(), 100);
    });

    mysqlProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    // Handle process completion
    mysqlProcess.on("close", (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          message: `MySQL MCP process exited with code ${code}`,
          error: errorData,
        });
        return;
      }

      try {
        // Parse the JSON-RPC response
        const response = JSON.parse(responseData.trim());

        if (response.error) {
          resolve({
            success: false,
            message: response.error.message,
            error: response.error,
          });
        } else if (response.result && response.result.content) {
          // Parse the content from MySQL MCP response
          const textContent = response.result.content.find(
            (c) => c.type === "text"
          );
          if (textContent) {
            const data = JSON.parse(textContent.text);
            resolve({
              success: true,
              data: data,
              rowCount: data.length,
              info: {
                host: params.mysqlHost || "localhost",
                database: params.mysqlDatabase,
                table: params.tableName,
              },
            });
          } else {
            resolve({
              success: false,
              message: "No text content found in MySQL MCP response",
              rawResponse: responseData,
            });
          }
        } else {
          resolve({
            success: false,
            message: "Invalid MySQL MCP response format",
            rawResponse: responseData,
          });
        }
      } catch (parseError) {
        resolve({
          success: false,
          message: `Failed to parse MySQL MCP response: ${parseError.message}`,
          rawResponse: responseData,
        });
      }
    });

    // Handle process errors
    mysqlProcess.on("error", (error) => {
      resolve({
        success: false,
        message: `Failed to start MySQL MCP process: ${error.message}`,
        error: error.message,
      });
    });

    // Send JSON-RPC request to MySQL MCP
    const request = {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "mysql_query",
        arguments: {
          sql: buildSelectQuery(params),
        },
      },
      id: Date.now(),
    };

    console.log(
      "📤 Sending request to MySQL MCP:",
      JSON.stringify(request, null, 2)
    );
    mysqlProcess.stdin.write(JSON.stringify(request) + "\n");
    mysqlProcess.stdin.end();

    // Set timeout - shorter since MySQL MCP responds quickly
    setTimeout(() => {
      mysqlProcess.kill();
      resolve({
        success: false,
        message: "MySQL MCP query timeout (10 seconds)",
        error: "TIMEOUT",
      });
    }, 10000);
  });
}

/**
 * Build SELECT query based on parameters
 */
function buildSelectQuery(params) {
  let sql = `SELECT * FROM ${params.mysqlDatabase}.${params.tableName}`;

  if (params.where) {
    sql += ` WHERE ${params.where}`;
  }

  if (params.orderBy) {
    sql += ` ORDER BY ${params.orderBy}`;
  }

  if (params.limit) {
    sql += ` LIMIT ${parseInt(params.limit)}`;
  }

  return sql;
}

/**
 * Format data for different output formats
 */
function formatData(data, format, options = {}) {
  switch (format.toLowerCase()) {
    case "json":
      const jsonData = {
        exportedAt: new Date().toISOString(),
        recordCount: data.length,
        tableName: options.tableName,
        data: data,
      };
      return options.prettyFormat !== false
        ? JSON.stringify(jsonData, null, 2)
        : JSON.stringify(jsonData);

    case "csv":
      return formatAsCSV(data, options);

    case "jsonl":
      return data.map((row) => JSON.stringify(row)).join("\n");

    default:
      return JSON.stringify(data, null, 2);
  }
}

/**
 * Format data as CSV
 */
function formatAsCSV(data, options = {}) {
  if (data.length === 0) return "";

  const delimiter = options.csvDelimiter || ",";
  const headers = Object.keys(data[0]);

  // Create header row
  let csv = headers.join(delimiter) + "\n";

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      let value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = "";
      }

      // Escape quotes and wrap in quotes if contains delimiter
      value = String(value);
      if (
        value.includes(delimiter) ||
        value.includes('"') ||
        value.includes("\n")
      ) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    });

    csv += values.join(delimiter) + "\n";
  }

  return csv;
}

/**
 * Generate filename based on table and format
 */
function generateFileName(tableName, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${tableName}_export_${timestamp}.${format}`;
}

/**
 * Get content type for format
 */
function getContentType(format) {
  const contentTypes = {
    json: "application/json",
    csv: "text/csv",
    jsonl: "application/x-jsonlines",
  };

  return contentTypes[format.toLowerCase()] || "text/plain";
}

module.exports = exportTableToStorage;
