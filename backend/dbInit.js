const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "gcn-legacy",
  password: process.env.DB_PASSWORD || "12345",
  port: process.env.DB_PORT || 5432,
});

async function initializeDatabase() {
  try {
    await db.connect();
    console.log("Connected to PostgreSQL");

    await db.query("BEGIN"); // Start a transaction

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    // Create chat_sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        chat_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chat_history table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        chat_id TEXT REFERENCES chat_sessions(chat_id),
        query TEXT NOT NULL,
        answer TEXT NOT NULL,
        pdf_references JSONB DEFAULT '[]',
        similar_images JSONB DEFAULT '[]',
        online_images JSONB DEFAULT '[]',
        online_videos JSONB DEFAULT '[]',
        online_links JSONB DEFAULT '[]',
        relevant_queries JSONB DEFAULT '[]',
        product_colors JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create chat_memory table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_memory (
        id SERIAL PRIMARY KEY,
        chat_id TEXT REFERENCES chat_sessions(chat_id),
        summary TEXT NOT NULL,
        key_points JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create products table
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        info TEXT NOT NULL,
        color VARCHAR(20) DEFAULT 'blue',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query("COMMIT"); // Commit the transaction
    console.log("Database tables ensured.");
    return db;
  } catch (error) {
    await db.query("ROLLBACK"); // Rollback in case of error
    console.error("Database initialization error:", error);
    throw error;
  }
}

module.exports = { initializeDatabase, db };
