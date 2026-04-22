const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000
});

// ======================
// CORE QUERY WRAPPER
// ======================
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error("❌ DB Query Error:", {
      text,
      error: err.message
    });
    throw err;
  }
};

// ======================
// SAFE TRANSACTION HELPER (FIXED)
// ======================
// IMPORTANT: prevents nested BEGIN bugs in services
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("❌ Transaction failed:", err.message);
    throw err;

  } finally {
    client.release();
  }
};

// ======================
// HEALTH CHECK
// ======================
pool.connect()
  .then(client => {
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
  });

// ======================
// GLOBAL POOL ERROR HANDLER
// ======================
pool.on("error", (err) => {
  console.error("🔥 Unexpected DB pool error:", err.message);
});

module.exports = {
  query,
  pool,
  transaction
};
