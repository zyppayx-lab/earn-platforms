const supabase = require('../../config/supabase');

exports.getWallet = async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from('users')
    .select('wallet_balance')
    .eq('id', userId)
    .single();

  if (error) return res.status(400).json(error);

  res.json(data);
};
