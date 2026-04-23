const db = require("../db");

async function logLedger(userId, type, amount, metadata = {}) {
  await db.query(
    `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
     VALUES ($1,$2,$3,$4)`,
    [userId, type, amount, JSON.stringify(metadata)]
  );
}

module.exports = { logLedger };
