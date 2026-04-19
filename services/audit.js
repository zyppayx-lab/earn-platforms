const db = require("../db");

async function logAction(adminId, action, metadata = {}) {
  await db.query(
    `INSERT INTO admin_audit_logs (admin_id, action, metadata)
     VALUES ($1,$2,$3)`,
    [adminId, action, JSON.stringify(metadata)]
  );
}

module.exports = { logAction };
