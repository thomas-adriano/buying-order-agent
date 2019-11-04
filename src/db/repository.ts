import moment from 'moment';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppConfigs } from '../app-configs';
import { IServerConfigs } from '../http/http-server';
import { BuyingOrder } from '../models/buying-order.model';
import { Provider } from '../models/provider.model';
import { Database } from './database';

export class Repository {
  constructor(private db: Database, private configs: IServerConfigs) {}

  public persistNotificationLog(
    provider: Provider,
    order: BuyingOrder,
    emailFrom: string
  ): Observable<boolean> {
    if (
      !provider ||
      !provider.email ||
      !order ||
      !order.idContato ||
      !order.data ||
      !order.dataPrevista ||
      !this.configs
    ) {
      return EMPTY;
    }
    const todayDate = moment().format('YYYY/MM/DD HH:mm:ss');
    const emptyDate = moment('01-01-1970', 'DD-MM-YYYY').format('YYYY-MM-DD');
    const orderDate = order.data
      ? moment(order.data, 'DD-MM-YYYY').format('YYYY-MM-DD')
      : emptyDate;
    const previewOrderDate = order.dataPrevista
      ? moment(order.dataPrevista, 'DD-MM-YYYY').format('YYYY-MM-DD')
      : emptyDate;
    return this.db
      .execute(
        `INSERT INTO \`${
          this.configs.appDatabase
        }\`.\`order-notification\` (timestamp,sent,providerEmail,employeeEmail,orderDate,estimatedOrderDate,providerId) VALUES (
              '${todayDate}',
              ${true},
              '${provider.email}',
              '${emailFrom}',
              '${orderDate}',
              '${previewOrderDate}',
              ${order.idContato});`
      )
      .pipe(
        map(() => {
          console.log('repository: notification logged into db');
          return true;
        }),
        catchError(err => {
          console.error(
            'repository: error trying to log notification into db',
            err
          );
          return new BehaviorSubject(false).asObservable();
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
                appServerHost,
                appServerPort,
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
                '${configs.getAppServerHost()}',
                ${configs.getAppServerPort()},
                '${configs.getAppCronPattern()}',
                '${configs.getAppCronTimezone()}',
                '${configs.getAppNotificationTriggerDelta()}'
              );`
      )
      .pipe(
        map(() => {
          console.log('repository: notification logged into db');
          return true;
        }),
        catchError(err => {
          console.error(
            'repository: error trying to log notification into db',
            err
          );
          return new BehaviorSubject(false).asObservable();
        })
      );
  }

  public getConfiguration(): Observable<AppConfigs> {
    return this.db
      .execute(
        `SELECT * FROM \`${this.configs.appDatabase}\`.\`configuration\` ORDER BY ID DESC LIMIT 1`
      )
      .pipe(
        map(([res]) => {
          return new AppConfigs()
            .setAppCronPattern(res.appCronPattern)
            .setAppCronTimezone(res.appCronTimezone)
            .setAppServerHost(res.appServerHost)
            .setAppServerPort(res.appServerPort)
            .setAppSMTPSecure(res.appSMTPSecure)
            .setAppEmailName(res.appEmailName)
            .setAppEmailUser(res.appEmailUser)
            .setAppEmailSubject(res.appEmailSubject)
            .setAppEmailPassword(res.appEmailPassword)
            .setAppEmailFrom(res.appEmailFrom)
            .setAppNotificationTriggerDelta(res.appNotificationTriggerDelta);
        })
      );
  }
}
