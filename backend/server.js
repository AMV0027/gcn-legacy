const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const multer = require("multer");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { initializeDatabase, db } = require("./dbInit");
require("dotenv").config();

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const corsOptions = {
  origin: "*", // Frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const logs = [];
let lastLogId = 0;

// Add a simple retry function
async function retryRequest(fn, retries = 3, delay = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}

// Fetch distinct chat list
app.get("/api/chat-list", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.chat_id, s.name, s.created_at, 
             h.query, h.answer
      FROM chat_sessions s
      LEFT JOIN chat_history h ON h.id = (
        SELECT id FROM chat_history 
        WHERE chat_id = s.chat_id 
        ORDER BY created_at ASC 
        LIMIT 1
      )
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error retrieving chat list:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const userExists = await db.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );
    if (userExists.rows.length)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "Username and password required" });

    const user = (
      await db.query("SELECT * FROM users WHERE username = $1", [username])
    ).rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful", userId: user.id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Fetch chat history for a specific chatId
app.get("/api/chat-history/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    const result = await db.query(
      `SELECT * FROM chat_history WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/metadata", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    const metadata = await getMetaData(url);
    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

app.get("/api/pdf", async (req, res) => {
  const { name, page } = req.query;
  if (!name) {
    return res.status(400).json({ error: "PDF name is required" });
  }

  try {
    const result = await db.query(
      "SELECT pdf_file FROM pdfdata WHERE pdf_name = $1",
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const pdfBuffer = result.rows[0].pdf_file;

    // Set content-disposition with page anchor if available
    const disposition = `inline; filename="${name}.pdf"${
      page ? `#page=${page}` : ""
    }`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", disposition);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error retrieving PDF:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/api/chat", async (req, res) => {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    await db.query("BEGIN"); // Start transaction

    try {
      // Delete chat memory first (due to foreign key constraint)
      await db.query("DELETE FROM chat_memory WHERE chat_id = $1", [chatId]);

      // Delete chat history
      await db.query("DELETE FROM chat_history WHERE chat_id = $1", [chatId]);

      // Delete chat session
      const result = await db.query(
        "DELETE FROM chat_sessions WHERE chat_id = $1",
        [chatId]
      );

      if (result.rowCount === 0) {
        await db.query("ROLLBACK");
        return res.status(404).json({ message: "Chat not found" });
      }

      await db.query("COMMIT");
      res.json({ message: "Chat deleted successfully" });
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Add this new endpoint
app.get("/api/logs", (req, res) => {
  const lastId = parseInt(req.query.lastId) || 0;
  const newLogs = logs.filter((log) => log.id > lastId);
  res.json(newLogs);
});

// Add this function to store logs
function addLog(message) {
  lastLogId++;
  logs.push({
    id: lastLogId,
    message,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.shift();
  }
}

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Create new product
app.post("/api/products", async (req, res) => {
  const { title, info } = req.body;
  const colors = ["red", "purple", "orange", "green", "blue", "white"];
  try {
    // Get existing products to determine next color
    const existingProducts = await db.query("SELECT color FROM products");
    const usedColors = existingProducts.rows.map((p) => p.color);
    const availableColor =
      colors.find((c) => !usedColors.includes(c)) || colors[0];

    const result = await db.query(
      "INSERT INTO products (title, info, color) VALUES ($1, $2, $3) RETURNING *",
      [title, info, availableColor]
    );

    // Generate and store related queries
    try {
      await axios.post("http://localhost:8000/api/generate-product-queries", {
        title,
        info,
      });
    } catch (error) {
      console.error("Error generating product queries:", error);
      // Continue with product creation even if query generation fails
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { title, info, color } = req.body;
  try {
    const result = await db.query(
      "UPDATE products SET title = $1, info = $2, color = $3 WHERE id = $4 RETURNING *",
      [title, info, color, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Remove the proxy middleware and handle the route directly
app.post("/api/query", async (req, res) => {
  try {
    const { query, org_query, chat_id } = req.body;
    const finalChatId = chat_id || crypto.randomUUID();

    // Forward request to AI server
    const aiResponse = await axios.post(
      "http://localhost:8000/api/query",
      {
        query,
        org_query,
        chat_id: finalChatId,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = aiResponse.data;

    // Create chat session if it doesn't exist
    await db.query(
      `INSERT INTO chat_sessions (chat_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (chat_id) DO NOTHING`,
      [finalChatId, data.chat_name || `Chat ${new Date().toISOString()}`]
    );

    // Store in database
    await db.query(
      `INSERT INTO chat_history 
       (chat_id, query, answer, pdf_references, online_images, online_videos, online_links, relevant_queries) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        finalChatId,
        query,
        data.answer,
        JSON.stringify(data.pdf_references || []),
        JSON.stringify(data.online_images || []),
        JSON.stringify(data.online_videos || []),
        JSON.stringify(data.online_links || []),
        JSON.stringify(data.related_queries || []),
      ]
    );

    // Send response back to frontend
    res.json({
      ...data,
      chatId: finalChatId,
    });
  } catch (error) {
    console.error("Error processing query:", error);
    res.status(500).json({
      error: "Failed to process query",
      details: error.message,
    });
  }
});

// PDF Management Endpoints
app.post("/api/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const formData = new FormData();
    formData.append("file", new Blob([req.file.buffer]), req.file.originalname);

    const response = await axios.post(
      "http://localhost:8000/api/upload-pdf",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({
      error: "Failed to upload PDF",
      details: error.message,
    });
  }
});

app.get("/api/search-pdfs", async (req, res) => {
  try {
    const { search_query } = req.query;
    const response = await axios.get(
      `http://localhost:8000/api/search-pdfs${
        search_query ? `?search_query=${search_query}` : ""
      }`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error searching PDFs:", error);
    res.status(500).json({
      error: "Failed to search PDFs",
      details: error.message,
    });
  }
});

app.delete("/api/delete-pdf/:pdf_name", async (req, res) => {
  try {
    const { pdf_name } = req.params;
    const response = await axios.delete(
      `http://localhost:8000/api/delete-pdf/${pdf_name}`
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error deleting PDF:", error);
    res.status(500).json({
      error: "Failed to delete PDF",
      details: error.message,
    });
  }
});

app.put("/api/update-pdf-info/:pdf_name", async (req, res) => {
  try {
    const { pdf_name } = req.params;
    const { new_info } = req.body;
    const response = await axios.put(
      `http://localhost:8000/api/update-pdf-info/${pdf_name}`,
      { new_info }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error updating PDF info:", error);
    res.status(500).json({
      error: "Failed to update PDF info",
      details: error.message,
    });
  }
});

// Add new endpoint to get random product queries
app.get("/api/random-product-queries", async (req, res) => {
  try {
    const response = await axios.get(
      "http://localhost:8000/api/random-product-queries"
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching random queries:", error);
    res.status(500).json({ error: "Failed to fetch random queries" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
