require("dotenv").config();

// ======================
// APP CONFIG
// ======================
const config = {
  app: {
    name: "Trivexa Pay",
    env: process.env.NODE_ENV || "development",
    port: process.env.PORT || 3000
  },

  // ======================
  // DATABASE
  // ======================
  db: {
    url: process.env.DATABASE_URL
  },

  // ======================
  // JWT
  // ======================
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: "7d"
  },

  // ======================
  // PAYSTACK
  // ======================
  paystack: {
    secret: process.env.PAYSTACK_SECRET,
    baseUrl: "https://api.paystack.co"
  },

  // ======================
  // REDIS
  // ======================
  redis: {
    url: process.env.REDIS_URL
  },

  // ======================
  // BUSINESS RULES
  // ======================
  business: {
    referralBonus: Number(process.env.REFERRAL_BONUS || 200),
    minReferralTasks: 2,
    autoApproveHours: 24
  }
};

module.exports = config;
