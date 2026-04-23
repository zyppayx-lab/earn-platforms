const router = require('express').Router();
const controller = require('./task.controller');

router.get('/', controller.getTasks);

module.exports = router;
