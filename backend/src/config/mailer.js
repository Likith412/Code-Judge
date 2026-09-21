const nodemailer = require("nodemailer");

const { SMTP_URL, MAIL_FROM } = require("./env");
const logger = require("./logger");

// console:// means "do not send anything, print it instead".
const isConsole = SMTP_URL.startsWith("console:");

const transport = isConsole
   ? nodemailer.createTransport({ jsonTransport: true })
   : nodemailer.createTransport(SMTP_URL);

async function sendMail({ to, subject, text, html }) {
   const info = await transport.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      text,
      html,
   });

   if (isConsole) {
      logger.info(
         `\n----- email -----\nto: ${to}\nsubject: ${subject}\n\n${text}\n-----------------`,
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

module.exports = { sendMail, verifyMailer };
