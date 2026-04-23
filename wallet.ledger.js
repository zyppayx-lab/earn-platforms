const supabase = require('../../config/supabase');

exports.creditWallet = async (user_id, amount, reference) => {
  const { error } = await supabase.from('wallet_ledger').insert([
    {
      user_id,
      amount,
      type: 'credit',
      reference
    }
  ]);

  return !error;
};
