const router = require('express').Router();
const controller = require('./health.controller');

router.get('/', controller.health);

module.exports = router;
