# MCP S3 Assistant SDK 🚀

An **AI-powered S3 assistant** that understands natural language and translates it into AWS S3 operations. Built with the Model Context Protocol (MCP) for seamless integration with Cursor/VS Code.

## ✨ What This Does

Talk to S3 in plain English:
- *"Create a private bucket called 'my-data' in Tokyo with object lock"*
- *"List first 10 buckets starting with 'test'"*  
- *"Upload encrypted PDF to glacier storage"*
- *"Download file if modified since yesterday"*

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

| Operation | Natural Language Example |
|-----------|-------------------------|
| **Create Bucket** | "Create private bucket in Europe with object lock" |
| **List Buckets** | "Show first 10 buckets starting with 'test'" |
| **Upload File** | "Upload encrypted PDF to glacier storage" |
| **Download File** | "Download first 1000 bytes if modified since yesterday" |

## 🏗️ Project Structure

```
mcp-assistant-sdk/
├── mcp-server.js           # 🧠 Main MCP server with AI prompt engineering
├── tools/                  # 🔧 S3 operations
│   ├── createBucket.js     #   ✅ Bucket creation with advanced options
│   ├── listBuckets.js      #   ✅ Intelligent bucket filtering  
│   ├── putObject.js        #   ✅ File upload with metadata
│   └── getObject.js        #   ✅ Conditional downloads
├── utils/
│   ├── s3Client.js         # ⚙️ AWS S3 client configuration
│   └── parameterMapper.js  # 🎯 Smart parameter mapping (AI → AWS)
└── package.json            # 📦 Dependencies
```

## 🧠 How It Works

1. **You speak naturally**: "Create a private bucket in Tokyo"
2. **AI extracts parameters**: `{ bucketName: "...", acl: "private", locationConstraint: "ap-northeast-1" }`
3. **Smart mapper converts**: `{ Bucket: "...", ACL: "private", CreateBucketConfiguration: { LocationConstraint: "ap-northeast-1" } }`
4. **AWS executes**: Bucket created successfully!

## 🔧 Key Features

- **🧠 AI Parameter Extraction**: Understands natural language
- **🎯 Smart Mapping**: Converts AI parameters to AWS SDK format
- **🌍 Region Intelligence**: "Tokyo" → "ap-northeast-1"
- **🚀 Future-Proof**: New AWS parameters work automatically
- **🔒 Secure**: Environment variable configuration

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