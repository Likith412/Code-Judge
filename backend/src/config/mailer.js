const nodemailer = require("nodemailer");

const { SMTP_URL, MAIL_FROM, WEB_URL } = require("./env");
const logger = require("./logger");

// console:// means "do not send anything, print it instead".
const isConsole = SMTP_URL.startsWith("console:");

const transport = isConsole
   ? nodemailer.createTransport({ jsonTransport: true })
   : nodemailer.createTransport(SMTP_URL);

async function sendMail({ to, subject, text, html, link }) {
   const info = await transport.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html,
   });

   if (isConsole) {
      logger.info(
         { to, subject, link },
         "Email not sent (console mode). Open the link.",
      );
   } else {
      logger.info({ to, subject, messageId: info.messageId }, "email sent");
   }

   return info;
}

async function verifyMailer() {
   if (isConsole) {
      logger.warn(
         "SMTP_URL is console://, emails are printed to the log and never sent",
      );

      return;
   }

   await transport.verify();
   logger.info("Mail transport ready");
}

// Both emails are the same shape.
const layout = (line, action, url) => ({
   link: url,
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

module.exports = {
   sendMail,
   verifyMailer,
   sendVerificationEmail,
   sendPasswordResetEmail,
};
