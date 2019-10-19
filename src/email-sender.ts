import * as nodemailer from "nodemailer";
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import Mail = require("nodemailer/lib/mailer");
import { Observable, from } from "rxjs";

export class EmailSender {
  constructor(private transportConfigs: SMTPTransport.Options) {}

  public sendEmail(emailConfigs: Mail.Options): Observable<any> {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(this.transportConfigs);
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    return from(transporter.sendMail(emailConfigs));
  }
}
