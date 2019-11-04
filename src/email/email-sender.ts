import * as nodemailer from 'nodemailer';
import SMTPTransport = require('nodemailer/lib/smtp-transport');
import Mail = require('nodemailer/lib/mailer');
import { Observable, from } from 'rxjs';
import { AppConfigs } from '../app-configs';

export class EmailSender {
  constructor(private transportConfigs: SMTPTransport.Options) {}

  public sendEmail(to: string, configs: AppConfigs): Observable<any> {
    return this.doSendEmail({
      from: `"${configs.getAppEmailName()}" <${configs.getAppEmailFrom()}>`, // sender address
      to, // list of receivers
      subject: configs.getAppEmailSubject(), // Subject line
      text: configs.getAppEmailText(), // plain text body
      html: configs.getAppEmailHtml() // html body
    });
  }

  private doSendEmail(emailConfigs: Mail.Options): Observable<any> {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(this.transportConfigs);
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    return from(transporter.sendMail(emailConfigs));
  }
}
