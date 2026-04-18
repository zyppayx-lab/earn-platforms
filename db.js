const { Pool } = require("pg");

// ======================
// DATABASE CONNECTION
// ======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // 🔐 REQUIRED FOR SUPABASE / RENDER
  ssl: {
    rejectUnauthorized: false
  },

  max: 20, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000
});

// ======================
// QUERY HELPER
// ======================
const query = (text, params) => pool.query(text, params);

// ======================
// CONNECTION TEST
// ======================
pool.connect()
  .then(client => {
    console.log("✅ PostgreSQL connected");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB connection error:", err);
  });

// ======================
// ERROR HANDLING
// ======================
pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
});

module.exports = {
  query,
  pool
};
