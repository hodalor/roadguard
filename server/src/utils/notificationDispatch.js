const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const NotificationChannelSettings = require('../models/NotificationChannelSettings');
const { logAuditEvent } = require('./auditLogger');
const {
  mapNotificationChannelSettings,
} = require('./notificationChannels');

function hasDatabaseConnection() {
  return mongoose.connection.readyState === 1;
}

async function loadNotificationSettings() {
  if (!hasDatabaseConnection()) {
    return mapNotificationChannelSettings();
  }

  const record = await NotificationChannelSettings.findOneAndUpdate(
    { singletonKey: 'default' },
    { $setOnInsert: { singletonKey: 'default' } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return mapNotificationChannelSettings(record);
}

function formatProviderLabel(provider) {
  return `${provider.label} (${provider.channel})`;
}

async function sendEmailViaGmail({ to, subject, text, html }) {
  const user = String(process.env.MAILER_GOOGLE_APP_EMAIL || '').trim();
  const pass = String(process.env.MAILER_GOOGLE_APP_PASSWORD || '').trim();
  const host = String(process.env.MAILER_SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.MAILER_SMTP_PORT || 465);
  const secure = String(process.env.MAILER_SMTP_SECURE || 'true').trim() !== 'false';
  const fromName = String(process.env.MAILER_FROM_NAME || 'RoadGuide Ghana').trim();
  const fromEmail = String(process.env.MAILER_FROM_EMAIL || user).trim();

  if (!user || !pass || !fromEmail) {
    throw new Error('Email provider is not configured in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html: html || undefined,
  });
}

async function sendSmsViaAfricasTalking({ to, message }) {
  const username = String(process.env.SMS_AT_USERNAME || '').trim();
  const apiKey = String(process.env.SMS_AT_API_KEY || '').trim();
  const senderId = String(process.env.SMS_AT_SENDER_ID || '').trim();

  if (!username || !apiKey) {
    throw new Error("Africa's Talking SMS is not configured in environment variables.");
  }

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      apiKey,
    },
    body: new URLSearchParams({
      username,
      to,
      message,
      ...(senderId ? { from: senderId } : {}),
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Africa's Talking request failed with status ${response.status}: ${responseText}`
    );
  }
}

async function logConsoleDispatch({ channel, provider, recipient, message, subject, metadata }) {
  await logAuditEvent({
    level: 'info',
    category: 'notifications',
    action: `${channel}_notification_logged`,
    actorType: 'system',
    message: `${channel.toUpperCase()} notification logged through ${formatProviderLabel(provider)}.`,
    metadata: {
      ...metadata,
      recipient,
      subject,
      body: message,
    },
  });
}

async function dispatchViaProvider({ channel, provider, recipient, subject, message, html, metadata }) {
  if (provider.providerKey === 'console_log') {
    await logConsoleDispatch({
      channel,
      provider,
      recipient,
      message,
      subject,
      metadata,
    });
    return;
  }

  if (channel === 'email' && provider.providerKey === 'gmail_smtp') {
    await sendEmailViaGmail({
      to: recipient,
      subject,
      text: message,
      html,
    });
    return;
  }

  if (channel === 'sms' && provider.providerKey === 'africastalking') {
    await sendSmsViaAfricasTalking({
      to: recipient,
      message,
    });
    return;
  }

  throw new Error(`Unsupported ${channel} provider: ${provider.providerKey}`);
}

async function notifyRecipients({
  channel,
  recipients,
  subject,
  message,
  html,
  metadata,
}) {
  const settings = await loadNotificationSettings();
  const providers = settings.providers.filter(
    (provider) => provider.channel === channel && provider.isActive
  );

  if (providers.length === 0) {
    await logAuditEvent({
      level: 'warning',
      category: 'notifications',
      action: `${channel}_notification_skipped`,
      actorType: 'system',
      message: `No active ${channel} notification provider is enabled.`,
      metadata,
    });
    return [];
  }

  const results = [];

  for (const recipient of recipients) {
    let delivered = false;
    let lastError = null;

    for (const provider of providers) {
      try {
        await dispatchViaProvider({
          channel,
          provider,
          recipient,
          subject,
          message,
          html,
          metadata,
        });
        results.push({
          recipient,
          channel,
          providerKey: provider.providerKey,
          status: 'sent',
        });
        delivered = true;
        break;
      } catch (error) {
        lastError = error;
        await logAuditEvent({
          level: 'error',
          category: 'notifications',
          action: `${channel}_notification_provider_failed`,
          actorType: 'system',
          message: `${channel.toUpperCase()} delivery failed through ${formatProviderLabel(provider)}.`,
          detail: error.message,
          metadata: {
            ...metadata,
            recipient,
            providerKey: provider.providerKey,
          },
        });
      }
    }

    if (!delivered) {
      results.push({
        recipient,
        channel,
        providerKey: null,
        status: 'failed',
        error: lastError?.message || 'Unknown delivery failure.',
      });
    }
  }

  return results;
}

module.exports = {
  loadNotificationSettings,
  notifyRecipients,
};
