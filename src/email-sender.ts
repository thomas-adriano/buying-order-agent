import * as nodemailer from "nodemailer";
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import Mail = require("nodemailer/lib/mailer");

export class EmailSender {
  public async sendEmail(
    transportConfigs: SMTPTransport.Options,
    emailConfigs: Mail.Options
  ): Promise<any> {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(transportConfigs);

    // send mail with defined transport object
    let info = await transporter.sendMail(emailConfigs);

    console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    return info;
  }
}
