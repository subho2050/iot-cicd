const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    // this.from = `Welcome Mail-IOT <${process.env.WELCOME_EMAIL_FROM}>`;
  }

  newTransport(user, pass) {
    if (process.env.NODE_ENV === 'production') {
      // Sendgrid
      return nodemailer.createTransport({
        // service: 'SendGrid',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: { user, pass }
    });
  }

  // Send the actual email
  async send(template, subject, from, user, pass) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../email/${template}.pug`, {
      firstName: this.firstName,
      redirectUrl: this.url,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: from,
      to: this.to,
      subject,
      html,
      // text: htmlToText.fromString(html)
    };

    // 3) Create a transport and send email
    await this.newTransport(user, pass).sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send(
      'welcome', 
      'Welcome, finish setting up your new Account',
      `Welcome Mail-IOT <${process.env.WELCOME_EMAIL_FROM}>`,
      process.env.WELCOME_EMAIL_FROM,
      process.env.WELCOME_EMAIL_PASSWORD,
    );
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token',
      `Password Reset <${process.env.NO_REPLY_EMAIL_FROM}>`,
      process.env.NO_REPLY_EMAIL_FROM,
      process.env.NO_REPLY_EMAIL_PASSWORD,
    );
  }
};
