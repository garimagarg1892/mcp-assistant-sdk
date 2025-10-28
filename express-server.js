#!/usr/bin/env node

/**
 * Express API Server that bridges React app with MCP Server
 * This server:
 * 1. Starts the MCP server as a child process
 * 2. Connects to it using AI SDK's MCP client
 * 3. Provides HTTP endpoints for the React app
 * 4. Integrates MCP tools with OpenAI model
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.EXPRESS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Note: MCP server processes are spawned per-request via stdio transport
// No need for a persistent MCP server process

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "express-api-server",
    note: "MCP servers are spawned per-request via stdio",
  });
});

// Main API endpoint for chat/streaming
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  try {
    // Import AI SDK dynamically
    const { streamText } = require("ai");
    const { createOpenAI } = require("@ai-sdk/openai");
    const { experimental_createMCPClient } = require("ai");
    const {
      StdioClientTransport,
    } = require("@modelcontextprotocol/sdk/client/stdio.js");

    // Create OpenAI instance
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || req.body.apiKey,
    });

    // Connect to MCP server via stdio
    console.log("Connecting to MCP server via stdio transport...");
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp-server.js")],
    });

    const mcpClient = await experimental_createMCPClient({ transport });
    const tools = await mcpClient.tools();

    console.log("Available MCP tools:", Object.keys(tools));
    console.log("Processing conversation with", messages.length, "messages");

    // Stream response with system message and full conversation history
    const result = streamText({
      model: openai("gpt-4o-mini"),
      tools,
      system: `You are an intelligent S3 Storage Assistant. You help users manage their AWS S3 buckets and objects through natural conversation.

Your capabilities:
- List and analyze S3 buckets with details
- Create new buckets with proper configuration
- Delete empty buckets
- Upload and download objects
- Read and list local files for upload
- Export MySQL tables to S3 storage

Communication style:
- Be friendly, conversational, and helpful
- Provide clear, actionable information
- Format responses with proper structure (lists, bullet points)
- Add helpful context and suggestions
- When showing bucket lists, include key details like creation dates
- Always confirm actions before performing destructive operations
- Remember previous context and refer to earlier parts of the conversation

When users ask questions:
1. Analyze their intent considering previous conversation
2. Use the appropriate MCP tools to gather information
3. Present results in a clear, organized manner
4. Offer relevant follow-up suggestions based on conversation history

Be proactive in helping users understand their storage usage and best practices.`,
      messages, // Pass full conversation history
      maxSteps: 5, // Allow multiple tool calls
      onFinish: async () => {
        console.log("Stream finished, closing MCP client");
        await mcpClient.close();
      },
      onError: async (error) => {
        console.error("Stream error:", error);
        await mcpClient.close();
      },
    });

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const stream = result.toDataStream();

    // Pipe the stream to response
    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
});

// Simple endpoint for testing (non-streaming)
app.post("/api/list-buckets", async (req, res) => {
  try {
    console.log("Received request to list buckets");

    const { streamText } = require("ai");
    const { createOpenAI } = require("@ai-sdk/openai");
    const { experimental_createMCPClient } = require("ai");
    const {
      StdioClientTransport,
    } = require("@modelcontextprotocol/sdk/client/stdio.js");

    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY || req.body.apiKey,
    });

    console.log("Creating stdio transport for MCP client...");
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.join(__dirname, "mcp-server.js")],
    });

    console.log("Connecting to MCP client...");
    const mcpClient = await experimental_createMCPClient({ transport });

    console.log("Fetching MCP tools...");
    const tools = await mcpClient.tools();
    console.log("Available tools:", Object.keys(tools));

    console.log("Calling OpenAI with MCP tools...");
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      tools,
      prompt:
        "Please analyze my S3 buckets and provide a friendly, conversational summary. Tell me how many buckets I have in total, identify which one was created most recently, and list all of them with their names and creation dates. Add helpful context and make it sound natural and engaging, like you are my assistant helping me understand my storage.",
      maxSteps: 5,
    });

    // Collect all text chunks
    let fullText = "";
    console.log("Collecting response text...");
    for await (const textPart of result.textStream) {
      fullText += textPart;
    }

    console.log("Closing MCP client...");
    await mcpClient.close();

    console.log("Success! Sending response...");
    res.json({
      success: true,
      response: fullText,
      toolsCalled: result.experimental_providerMetadata?.tools || [],
    });
  } catch (error) {
    console.error("Error in /api/list-buckets:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down Express server...");
  process.exit(0);
});

// Start the Express server
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log(`✅ Express API Server running on http://localhost:${PORT}`);
  console.log(`✅ MCP Servers spawn per-request via stdio`);
  console.log("=".repeat(60));
  console.log("\nAvailable endpoints:");
  console.log(`  - POST http://localhost:${PORT}/api/chat`);
  console.log(`  - POST http://localhost:${PORT}/api/list-buckets`);
  console.log(`  - GET  http://localhost:${PORT}/health`);
  console.log("\nReady to receive requests from React app! 🚀\n");
});
