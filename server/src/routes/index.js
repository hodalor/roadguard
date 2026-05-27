const express = require('express');

const motoristsRoutes = require('./motorists');
const providersRoutes = require('./providers');
const hazardsRoutes = require('./hazards');
const sosRoutes = require('./sos');
const contentRoutes = require('./content');
const contactsRoutes = require('./contacts');
const servicesRoutes = require('./services');
const analyticsRoutes = require('./analytics');
const authRoutes = require('./auth');
const auditLogsRoutes = require('./auditLogs');
const notificationsRoutes = require('./notifications');
const settingsRoutes = require('./settings');

const router = express.Router();

router.use('/motorists', motoristsRoutes);
router.use('/providers', providersRoutes);
router.use('/hazards', hazardsRoutes);
router.use('/sos', sosRoutes);
router.use('/content', contentRoutes);
router.use('/contacts', contactsRoutes);
router.use('/services', servicesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/auth', authRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
