const router = require('express').Router();
const controller = require('./wallet.controller');

router.get('/:userId', controller.getWallet);

module.exports = router;
