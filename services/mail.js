const keys = require('../config/keys');

// No real email provider is wired up in this project — this "sends" mail
// by logging what would have gone out instead of actually delivering it.
const sendMail = async ({ to, subject, html }) => {
  console.log('----- MOCK EMAIL (no provider configured) -----');
  console.log(`From:    ${keys.mail.from}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(html);
  console.log('----- END MOCK EMAIL -----');

  return { mocked: true };
};

module.exports = { sendMail };
