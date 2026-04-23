const supabase = require('../../config/supabase');

exports.getTasks = async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'active');

  if (error) return res.status(400).json(error);

  res.json(data);
};
