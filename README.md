# MCP S3 Assistant SDK with MySQL Bridge 🚀

An **AI-powered S3 assistant** with **MySQL-to-ObjectStore pipeline** that understands natural language and translates it into AWS S3 operations and database exports. Built with the Model Context Protocol (MCP) for seamless integration with Cursor/VS Code.

## ✨ What This Does

### **S3 Operations:**
- *"Create a private bucket called 'my-data' in Tokyo with object lock"*
- *"List first 10 buckets starting with 'test'"*  
- *"Upload encrypted PDF to glacier storage"*
- *"Download file if modified since yesterday"*

### **🆕 MySQL-to-S3 Bridge:**
- *"Export users from test_db to my-backup-bucket"*
- *"Export products from inventory_db to sales-bucket as CSV"*
- *"Export orders from ecommerce_db where status='completed' to archive-bucket"*

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

## 🎯 Available Operations

### **S3 Operations:**
| Operation | Natural Language Example |
|-----------|-------------------------|
| **Create Bucket** | "Create private bucket in Europe with object lock" |
| **List Buckets** | "Show first 10 buckets starting with 'test'" |
| **Upload File** | "Upload encrypted PDF to glacier storage" |
| **Download File** | "Download first 1000 bytes if modified since yesterday" |

### **🆕 MySQL-to-S3 Bridge:**
| Operation | Natural Language Example |
|-----------|-------------------------|
| **Export Table** | "Export users from test_db to backup-bucket" |
| **Export with Filter** | "Export orders where status='completed' to archive-bucket" |
| **Export as CSV** | "Export products from inventory_db to sales-bucket as CSV" |
| **Export with Limit** | "Export first 1000 customers to sample-bucket" |

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