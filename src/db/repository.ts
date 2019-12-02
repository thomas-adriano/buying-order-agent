import moment from "moment";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { AppConfigs } from "../app-configs";
import { BuyingOrder } from "../models/buying-order.model";
import { Provider } from "../models/provider.model";
import { IServerConfigsModel } from "../server-configs.service";
import { Database } from "./database";

export class Repository {
  constructor(private db: Database, private configs: IServerConfigsModel) {}

  public end(): void {
    this.db.end();
  }

  public isOrderAlreadyProcessed(order: BuyingOrder): Observable<boolean> {
    return this.db
      .execute(
        `SELECT COUNT(*) AS RES FROM \`${this.configs.appDatabase}\`.\`order-notification\` WHERE buyingOrderId = ${order.id} AND SENT = 1 LIMIT 1`
      )
      .pipe(
        map(res => {
          const r = res.RES;
          return !!r;
        })
      );
  }

  public persistNotificationLog(
    provider: Provider,
    order: BuyingOrder,
    emailFrom: string,
    sent = true
  ): Observable<boolean> {
    if (!provider || !order || !this.configs) {
      console.log("NOT LOGGGED");
      return new BehaviorSubject(false);
    }
    const todayDate = moment().format("YYYY/MM/DD HH:mm:ss");
    const emptyDate = moment("01-01-1970", "DD-MM-YYYY").format("YYYY-MM-DD");
    const orderDate = order.data
      ? moment(order.data, "DD-MM-YYYY").format("YYYY-MM-DD")
      : emptyDate;
    const previewOrderDate = order.dataPrevista
      ? moment(order.dataPrevista, "DD-MM-YYYY").format("YYYY-MM-DD")
      : emptyDate;
    return this.db
      .execute(
        `INSERT INTO \`${this.configs.appDatabase}\`.\`order-notification\`
          (timestamp,sent,providerEmail,employeeEmail,orderDate,estimatedOrderDate,providerId,buyingOrderId)
          VALUES (
            '${todayDate}',
            ${sent},
            '${provider.email}',
            '${emailFrom}',
            '${orderDate}',
            '${previewOrderDate}',
            ${order.idContato},
            ${order.id}
          )
          ON DUPLICATE KEY UPDATE
            sent=${sent},
            timestamp='${todayDate}';`
      )
      .pipe(
        map(() => {
          return true;
        }),
        catchError(err => {
          console.error(
            "repository: error trying to log notification into db",
            err
          );
          return throwError(err);
        })
      );
  }

  public persistConfiguration(configs: AppConfigs): Observable<boolean> {
    return this.db
      .execute(
        `INSERT INTO \`${this.configs.appDatabase}\`.\`configuration\`
              (
                appEmailName,
                appEmailUser,
                appEmailPassword,
                appSMTPAddress,
                appSMTPPort,
                appSMTPSecure,
                appEmailFrom,
                appEmailSubject,
                appEmailText,
                appEmailHtml,
                appCronPattern,
                appCronTimezone,
                appNotificationTriggerDelta
              )
                VALUES
              (
                '${configs.getAppEmailName()}',
                '${configs.getAppEmailUser()}',
                '${configs.getAppEmailPassword()}',
                '${configs.getAppSMTPAddress()}',
                ${configs.getAppSMTPPort()},
                ${configs.getAppSMTPSecure()},
                '${configs.getAppEmailFrom()}',
                '${configs.getAppEmailSubject()}',
                '${configs.getAppEmailText()}',
                '${configs.getAppEmailHtml()}',
                '${configs.getAppCronPattern()}',
                '${configs.getAppCronTimezone()}',
                '${configs.getAppNotificationTriggerDelta()}'
              );`
      )
      .pipe(
        map(() => {
          return true;
        }),
        catchError(err => {
          console.error(
            "repository: error trying to log notification into db",
            err
          );
          return throwError(err);
        })
      );
  }

  public getConfiguration(): Observable<AppConfigs> {
    return this.db
      .execute(
        `SELECT * FROM \`${this.configs.appDatabase}\`.\`configuration\` ORDER BY ID DESC LIMIT 1`
      )
      .pipe(
        map(res => {
          if (res) {
            return new AppConfigs()
              .setAppCronPattern(res.appCronPattern)
              .setAppCronTimezone(res.appCronTimezone)
              .setAppSMTPSecure(res.appSMTPSecure)
              .setAppSMTPAddress(res.appSMTPAddress)
              .setAppSMTPPort(res.appSMTPPort)
              .setAppEmailName(res.appEmailName)
              .setAppEmailUser(res.appEmailUser)
              .setAppEmailText(res.appEmailText)
              .setAppEmailHtml(res.appEmailHtml)
              .setAppEmailSubject(res.appEmailSubject)
              .setAppEmailPassword(res.appEmailPassword)
              .setAppEmailFrom(res.appEmailFrom)
              .setAppNotificationTriggerDelta(res.appNotificationTriggerDelta);
          } else {
            return new AppConfigs();
          }
        })
      );
  }
}
