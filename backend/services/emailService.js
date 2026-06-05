const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  return transporter;
};

const isEmailConfigured = () => Boolean(getTransporter());

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sendFeedbackNotification = async (feedback, user) => {
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    console.warn('Feedback email skipped: set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return { sent: false, reason: 'not_configured' };
  }

  const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL || process.env.GMAIL_USER;
  const stars = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);
  const submittedAt = new Date(feedback.createdAt || Date.now()).toLocaleString('en-PH', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">New Feedback Received</h2>
      <p style="color: #555; margin-top: 0;">A new feedback submission was received on EduPulse.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">From</td><td>${escapeHtml(user.fullName)} (${escapeHtml(user.role)})</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email</td><td>${escapeHtml(user.email)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Category</td><td>${escapeHtml(feedback.category || 'general')}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Rating</td><td>${stars} (${feedback.rating}/5)</td></tr>
        ${feedback.school ? `<tr><td style="padding: 8px 0; font-weight: bold;">School</td><td>${escapeHtml(feedback.school)}</td></tr>` : ''}
        ${feedback.classCode ? `<tr><td style="padding: 8px 0; font-weight: bold;">Class Code</td><td>${escapeHtml(feedback.classCode)}</td></tr>` : ''}
        <tr><td style="padding: 8px 0; font-weight: bold;">Submitted</td><td>${escapeHtml(submittedAt)}</td></tr>
      </table>
      <div style="background: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-weight: bold;">Message</p>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(feedback.message)}</p>
      </div>
    </div>
  `;

  const text = [
    'New Feedback Received',
    '',
    `From: ${user.fullName} (${user.role})`,
    `Email: ${user.email}`,
    `Category: ${feedback.category || 'general'}`,
    `Rating: ${feedback.rating}/5`,
    feedback.school ? `School: ${feedback.school}` : null,
    feedback.classCode ? `Class Code: ${feedback.classCode}` : null,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    feedback.message
  ].filter(Boolean).join('\n');

  try {
    await mailTransporter.sendMail({
      from: `"EduPulse Feedback" <${process.env.GMAIL_USER}>`,
      to: notifyEmail,
      replyTo: user.email,
      subject: `[EduPulse] New ${user.role} feedback (${feedback.rating}/5) - ${user.fullName}`,
      text,
      html
    });

    console.log(`Feedback notification email sent to ${notifyEmail}`);
    return { sent: true };
  } catch (error) {
    console.error('Failed to send feedback notification email:', error.message);
    return { sent: false, reason: error.message };
  }
};

module.exports = {
  isEmailConfigured,
  sendFeedbackNotification
};
