exports.health = (req, res) => {
  res.json({
    status: 'OK',
    service: 'TrivexaPay Backend'
  });
};
