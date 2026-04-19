const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000
});

// ======================
// QUERY
// ======================
const query = (text, params) => {
  return pool.query(text, params);
};

// ======================
// HEALTH CHECK
// ======================
pool.connect()
  .then(client => {
    console.log("✅ Database connected");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB Error:", err);
  });

// ======================
// ERROR LISTENER
// ======================
pool.on("error", (err) => {
  console.error("Unexpected DB error:", err);
});

module.exports = {
  query,
  pool
};
