const { WEB_URL } = require("../config/env");
const { sendMail } = require("../config/mailer");

const layout = (line, action, url) => ({
   text: `${line}\n\n${action}: ${url}\n\nIf you did not ask for this, ignore this email.`,
   html: `<p>${line}</p><p><a href="${url}">${action}</a></p><p style="color:#64748b;font-size:12px">If you did not ask for this, ignore this email.</p>`,
});

function sendVerificationEmail({ to, token }) {
   const body = layout(
      "Confirm your address to finish setting up your Code Judge account. The link works once and expires in 24 hours.",
      "Confirm my email",
      `${WEB_URL}/verify?token=${token}`,
   );

   return sendMail({ to, subject: "Confirm your Code Judge email", ...body });
}

function sendPasswordResetEmail({ to, token }) {
   const body = layout(
      "Someone asked to reset the password on your Code Judge account. The link works once and expires in 30 minutes. Using it signs you out on every device.",
      "Choose a new password",
      `${WEB_URL}/reset-password?token=${token}`,
   );

   return sendMail({ to, subject: "Reset your Code Judge password", ...body });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
