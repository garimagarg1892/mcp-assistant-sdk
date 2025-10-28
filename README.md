# MCP S3 Assistant SDK with MySQL Bridge 🚀

An **AI-powered S3 assistant** with **MySQL-to-ObjectStore pipeline** that understands natural language and translates it into AWS S3 operations and database exports. Built with the Model Context Protocol (MCP) for seamless integration with Cursor/VS Code.

## ✨ What This Does

### **S3 Operations:**

- _"Create a private bucket called 'my-data' in Tokyo with object lock"_
- _"List first 10 buckets starting with 'test'"_
- _"Upload encrypted PDF to glacier storage"_
- _"Download file if modified since yesterday"_

### **🆕 AI Content Analysis:**

- _"Get the company-data.csv file and summarize the key metrics for 2025"_
- _"Download sales.csv and tell me the profit percentage for Q4"_
- _"Fetch the error.log file and identify the most common errors"_
- _"Get the product-image.jpg and describe what you see"_

### **🆕 MySQL-to-S3 Bridge:**

- _"Export users from test_db to my-backup-bucket"_
- _"Export products from inventory_db to sales-bucket as CSV"_
- _"Export orders from ecommerce_db where status='completed' to archive-bucket"_

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cursor/VS Code

Add this to your `.cursor/settings.json`:

```json
{
  "mcp.servers": {
    "s3-assistant": {
      "command": "node",
      "args": ["/home/garima.garg/mcp-assistant-sdk/mcp-server.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "your_aws_access_key_id",
        "AWS_SECRET_ACCESS_KEY": "your_aws_secret_access_key",
        "AWS_REGION": "us-east-1",
        "S3_ENDPOINT": "http://localhost:7200"
      }
    }
  }
}
```

### 3. Test It

```bash
npm run mcp-server
```

### 4. Analyze File Content (Example)

Once your MCP server is running, you can ask your AI assistant:

```
User: "Get the sales-2025.csv file from my-bucket and tell me the total revenue"

AI: 
1. Downloads sales-2025.csv from S3
2. Reads the CSV content directly
3. Analyzes the data
4. Responds: "The total revenue from sales-2025.csv is $2,450,000..."
```

**More examples:**
- "Fetch company-data.csv and show me metrics for Q4 2025"
- "Get the logo.png and describe what's in the image"
- "Download error.log and identify the most frequent errors"

## 🎯 Available Operations

### **S3 Operations:**

| Operation         | Natural Language Example                                |
| ----------------- | ------------------------------------------------------- |
| **Create Bucket** | "Create private bucket in Europe with object lock"      |
| **List Buckets**  | "Show first 10 buckets starting with 'test'"            |
| **Upload File**   | "Upload encrypted PDF to glacier storage"               |
| **Download File** | "Download first 1000 bytes if modified since yesterday" |

### **🆕 AI Content Analysis:**

| File Type | Natural Language Example |
|-----------|-------------------------|
| **CSV Files** | "Get company-data.csv and give me metrics from year 2025" |
| **CSV Analytics** | "Fetch sales.csv and what is the profit % for Q4?" |
| **JSON Files** | "Download config.json and tell me what the database settings are" |
| **Log Files** | "Get error.log and summarize the top 5 errors" |
| **Code Files** | "Fetch app.js and explain what the authentication flow does" |
| **Images** | "Get product-photo.jpg and describe what's in the image" |
| **Image OCR** | "Download receipt.png and extract the text from it" |

### **🆕 MySQL-to-S3 Bridge:**

| Operation              | Natural Language Example                                   |
| ---------------------- | ---------------------------------------------------------- |
| **Export Table**       | "Export users from test_db to backup-bucket"               |
| **Export with Filter** | "Export orders where status='completed' to archive-bucket" |
| **Export as CSV**      | "Export products from inventory_db to sales-bucket as CSV" |
| **Export with Limit**  | "Export first 1000 customers to sample-bucket"             |

## 🏗️ Project Structure

```
mcp-assistant-sdk/
├── mcp-server.js                    # 🧠 Main MCP server with AI prompt engineering
├── tools/                           # 🔧 S3 & Database operations
│   ├── createBucket.js              #   ✅ Bucket creation with advanced options
│   ├── listBuckets.js               #   ✅ Intelligent bucket filtering
│   ├── putObject.js                 #   ✅ File upload with metadata
│   ├── getObject.js                 #   ✅ Conditional downloads
│   ├── exportTableToStorage.js      #   🆕 MySQL-to-S3 bridge tool
│   ├── readFile.js                  #   📁 Local file reading
│   └── listDirectory.js             #   📂 Directory browsing
├── utils/
│   ├── s3Client.js                  # ⚙️ AWS S3 client configuration
│   ├── parameterMapper.js           # 🎯 Smart parameter mapping (AI → AWS)
│   └── fileSystem.js                # 📁 File system utilities
├── .cursor/settings.json            # ⚙️ MCP server configuration
├── MYSQL_SETUP.md                   # 📖 MySQL bridge setup guide
└── package.json                     # 📦 Dependencies (includes mysql2)
```

## 🧠 How It Works

### **S3 Operations:**

1. **You speak naturally**: "Create a private bucket in Tokyo"
2. **AI extracts parameters**: `{ bucketName: "...", acl: "private", locationConstraint: "ap-northeast-1" }`
3. **Smart mapper converts**: `{ Bucket: "...", ACL: "private", CreateBucketConfiguration: { LocationConstraint: "ap-northeast-1" } }`
4. **AWS executes**: Bucket created successfully!

### **🆕 MySQL-to-S3 Bridge:**

1. **You speak naturally**: "Export users from test_db to backup-bucket"
2. **Bridge tool spawns**: MySQL MCP server process
3. **MySQL MCP queries**: `SELECT * FROM test_db.users`
4. **Data formatting**: Convert to JSON/CSV with metadata
5. **S3 MCP uploads**: File to specified bucket
6. **Success**: `✅ Exported 5 users to backup-bucket/users_export_2024-10-01.json`

## 🔧 Key Features

### **Core Features:**

- **🧠 AI Parameter Extraction**: Understands natural language
- **🎯 Smart Mapping**: Converts AI parameters to AWS SDK format
- **🌍 Region Intelligence**: "Tokyo" → "ap-northeast-1"
- **🚀 Future-Proof**: New AWS parameters work automatically
- **🔒 Secure**: Environment variable configuration

### **🆕 AI Content Analysis Features:**

- **📄 Text File Analysis**: Directly read and analyze CSV, JSON, TXT, logs, code files
- **🖼️ Image Vision**: Analyze images, describe content, read text from images (JPG, PNG, GIF, WEBP)
- **📊 Document Handling**: Support for PDF, DOCX, XLSX (with metadata)
- **💬 Natural Questions**: Ask questions about file content in plain language
- **📈 Data Insights**: Get metrics, summaries, trends from CSV/JSON files
- **🔍 Log Analysis**: Identify errors, patterns, and anomalies in log files

### **Supported File Types for AI Analysis:**

| Type | Extensions | AI Capabilities |
|------|-----------|-----------------|
| **Text Files** | `.csv`, `.json`, `.txt`, `.log`, `.xml`, `.html`, `.md` | ✅ Full content reading, analysis, Q&A |
| **Code Files** | `.js`, `.py`, `.java`, `.go`, `.rs`, `.cpp`, `.ts` | ✅ Code review, explanation, bug detection |
| **Images** | `.jpg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg` | ✅ Visual analysis, OCR, description |
| **Documents** | `.pdf`, `.docx`, `.xlsx`, `.pptx` | ⚠️ Metadata only (text extraction coming soon) |
| **Binary Files** | `.zip`, `.exe`, `.bin` | ℹ️ Metadata and size information |

### **🆕 MySQL Bridge Features:**

- **🔗 MCP-to-MCP Bridge**: Connects MySQL MCP ↔ S3 MCP
- **📊 Multi-Format Export**: JSON, CSV, JSONL with metadata
- **🔍 Query Filtering**: Support for WHERE, ORDER BY, LIMIT clauses
- **🛡️ Read-Only Access**: Secure database operations
- **⚡ On-Demand Processing**: MySQL MCP spawned only when needed
- **📈 Production Ready**: Comprehensive error handling and logging

## 📝 Development Notes

See `DEVELOPMENT_NOTES.md` for version evolution and architecture decisions.

## 🛠️ Troubleshooting

### Server Not Starting

- Check Node.js is installed: `node --version`
- Verify file paths in MCP configuration
- Check AWS credentials are set

### AWS Connection Issues

- Verify credentials have S3 permissions
- Check S3_ENDPOINT for MinIO/LocalStack setups
- Ensure AWS_REGION is valid

---

**Ready to use!** 🎉 Your AI assistant can now manage S3 with natural language.
