const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "binshabibgroup.ae",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.SYSTEM_EMAIL,
    pass: process.env.SYSTEM_EMAIL_PASSWORD,
  },
  tls: {
    ciphers: "SSLv3",
  },
});

module.exports = transporter;