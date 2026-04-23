const express = require('express');
const cors = require('cors');

const authRoutes = require('./auth.routes');
const walletRoutes = require('./wallet.routes');
const taskRoutes = require('./task.routes');
const webhookRoutes = require('./webhook.routes');
const healthRoutes = require('./health.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/health', healthRoutes);

module.exports = app;
