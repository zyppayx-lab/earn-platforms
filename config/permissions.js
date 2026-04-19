// ======================
// 🔐 PERMISSION TEMPLATES
// ======================

const PERMISSIONS = {
  FINANCE_ADMIN: {
    can_approve_withdrawals: true,
    can_view_finance: true,
    can_view_dashboard: true
  },

  ANALYTICS_ADMIN: {
    can_view_dashboard: true
  },

  FRAUD_ADMIN: {
    can_manage_fraud: true,
    can_view_dashboard: true
  },

  ESCROW_ADMIN: {
    can_manage_escrow: true,
    can_view_finance: true
  },

  BASIC_ADMIN: {
    can_view_dashboard: true
  }
};

module.exports = PERMISSIONS;
