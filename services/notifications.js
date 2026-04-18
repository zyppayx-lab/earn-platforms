const admin = require("firebase-admin");
const db = require("../db");

// init firebase
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  )
});

async function sendPush(userId, title, body) {
  const tokens = await db.query(
    "SELECT token FROM device_tokens WHERE user_id=$1",
    [userId]
  );

  if (!tokens.rows.length) return;

  const message = {
    notification: { title, body },
    tokens: tokens.rows.map(t => t.token)
  };

  await admin.messaging().sendMulticast(message);
}

module.exports = { sendPush };
