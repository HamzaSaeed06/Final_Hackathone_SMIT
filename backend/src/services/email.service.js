const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@maintainiq.com';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log('✅ Nodemailer SMTP transporter initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Nodemailer transporter:', err.message);
  }
} else {
  console.log('💡 SMTP credentials missing. Email service will run in Console Log mode.');
}

/**
 * Helper to dispatch emails. If transporter setup is bypassed/fails, fallback to stdout.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return;

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✉️  Email successfully sent to ${to} (Subject: "${subject}")`);
    } else {
      console.log(`[Email Console Fallback]
=========================================
TO:      ${to}
FROM:    ${SMTP_FROM}
SUBJECT: ${subject}
BODY:    ${text}
=========================================`);
    }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
  }
};

/**
 * Trigger assignment notification to technician
 */
const sendAssignmentEmail = async (techEmail, techName, issueNumber, assetName, assetLocation, severity) => {
  const subject = `[MaintainIQ] Assigned Issue: ${issueNumber}`;
  const text = `Hello ${techName},\n\nYou have been assigned to maintenance issue ${issueNumber} on MaintainIQ.\n\nAsset: ${assetName}\nLocation: ${assetLocation}\nPriority: ${severity}\n\nPlease inspect the asset and begin resolution details.\n\nBest regards,\nMaintainIQ Operations Team`;
  
  await sendEmail({ to: techEmail, subject, text });
};

/**
 * Trigger resolution notification to public reporter
 */
const sendResolutionEmail = async (reporterEmail, reporterName, issueNumber, assetName) => {
  const subject = `[MaintainIQ] Issue Resolved: ${issueNumber}`;
  const text = `Hello ${reporterName || 'User'},\n\nThe issue you reported (${issueNumber}) for asset "${assetName}" has been successfully resolved.\n\nThe asset is now verified operational. Thank you for reporting this issue.\n\nBest regards,\nMaintainIQ Operations Team`;
  
  await sendEmail({ to: reporterEmail, subject, text });
};

module.exports = {
  sendEmail,
  sendAssignmentEmail,
  sendResolutionEmail,
};
