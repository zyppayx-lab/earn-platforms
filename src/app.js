const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const walletRoutes = require('./modules/wallet/wallet.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const webhookRoutes = require('./modules/webhooks/webhook.routes');
const healthRoutes = require('./health/health.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/health', healthRoutes);

module.exports = app;
