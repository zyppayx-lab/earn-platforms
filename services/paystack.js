const axios = require("axios");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

async function initializePayment(email, amount) {
  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: amount * 100
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`
      }
    }
  );

  return response.data;
}

module.exports = { initializePayment };
