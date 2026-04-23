const supabase = require('../../config/supabase');
const { creditWallet } = require('../wallet/wallet.ledger');

exports.paystackWebhook = async (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const { amount, reference, customer } = event.data;

    // prevent duplicates
    const { data: exists } = await supabase
      .from('wallet_ledger')
      .select('*')
      .eq('reference', reference);

    if (exists.length > 0) return res.sendStatus(200);

    await creditWallet(customer.email, amount / 100, reference);
  }

  res.sendStatus(200);
};
