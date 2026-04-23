const db = require("../db");
const crypto = require("crypto");

// ======================
// ENTERPRISE AUDIT LOGGER
// ======================
async function logAction(adminId, action, metadata = {}) {
  const logEntry = {
    id: crypto.randomUUID(),
    admin_id: adminId,
    action,
    metadata,
    created_at: new Date().toISOString()
  };

  try {
    // ======================
    // PRIMARY WRITE (POSTGRES)
    // ======================
    await db.query(
      `INSERT INTO admin_audit_logs 
       (id, admin_id, action, metadata, created_at)
       VALUES ($1,$2,$3,$4, NOW())`,
      [
        logEntry.id,
        adminId,
        action,
        JSON.stringify(metadata)
      ]
    );

  } catch (err) {
    // ======================
    // NEVER BREAK MAIN FLOW
    // ======================
    console.error("AUDIT LOG FAILED:", {
      adminId,
      action,
      error: err.message
    });

    // ======================
    // OPTIONAL FALLBACK STORAGE (SAFE)
    // ======================
    try {
      await db.query(
        `INSERT INTO audit_failures (payload, error, created_at)
         VALUES ($1,$2,NOW())`,
        [
          JSON.stringify(logEntry),
          err.message
        ]
      );
    } catch (_) {
      // absolute last safety layer (silent fail)
    }
  }
}

module.exports = { logAction };
