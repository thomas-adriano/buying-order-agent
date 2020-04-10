import * as nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { from, Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AppConfigs } from "../app-configs";
import { IProviderAndOrder } from "../notification-scheduler";
import { ServerConfigsService } from "../server-configs.service";

export class EmailSender {
  private serverConfigsService = ServerConfigsService.getInstance();

  constructor(private transportConfigs: SMTPTransport.Options) {}

  public sendEmail(
    to: string | undefined,
    configs: AppConfigs,
    entry: IProviderAndOrder
  ): Observable<any> {
    return this.doSendEmail({
      from: `"${configs.getAppEmailName()}" <${configs.getAppEmailFrom()}>`, // sender address
      to, // list of receivers
      subject: this.interpolateVariables(configs.getAppEmailSubject(), entry), // Subject line
      text: this.interpolateVariables(configs.getAppEmailText(), entry), // plain text body
      html: this.interpolateVariables(configs.getAppEmailHtml(), entry) // html body
    });
  }

  private doSendEmail(emailConfigs: Mail.Options): Observable<any> {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport(this.transportConfigs);
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    return from(transporter.sendMail(emailConfigs)).pipe(
      tap(() =>
        console.log(`email-sender: sending e-mail to ${emailConfigs.to} with Subject ${emailConfigs.subject}`)
      )
    );
  }

  private interpolateVariables(
    content: string,
    entry: IProviderAndOrder
  ): string {
    if (!content) {
      return content;
    }

    let ret = content
      .replace(/\$\{providerName\}/g, `${entry.provider.nome}`)
      .replace(/\$\{orderNumber\}/g, `${entry.order.id}`)
      .replace(/\$\{orderDate\}/g, `${entry.order.data}`)
      .replace(/\$\{previewOrderDate\}/g, `${entry.order.dataPrevista}`)
      .replace(/\$\{orderContactName\}/g, `${entry.order.nomeContato}`);

    if (this.serverConfigsService.configs.replyLink) {
      ret = ret.replace(
        /\$\{replyLink\}/g,
        `<a class="reply-link" href="${this.serverConfigsService.configs.replyLink}?providerId=${entry.provider.id}">Definir uma nova data</a>`
      );
    }
    return ret;
  }
}
