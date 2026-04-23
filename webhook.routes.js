const router = require('express').Router();
const controller = require('./paystack.webhook');

router.post('/paystack', controller.paystackWebhook);

module.exports = router;
