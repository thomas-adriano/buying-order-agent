import moment from "moment";
import { AppConfigs } from "../app-configs";
import { BuyingOrder } from "../models/buying-order.model";
import { Database } from "./database";
import { Provider } from "../models/provider.model";
import { Observable, BehaviorSubject } from "rxjs";
import { catchError, map } from "rxjs/operators";

export class Repository {
  constructor(private db: Database) {}

  public persistNotificationLog(
    provider: Provider,
    order: BuyingOrder,
    configs: AppConfigs
  ): Observable<boolean> {
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
        `INSERT INTO \`${configs.getAppDatabase()}\`.\`order-notification\` (timestamp,sent,providerEmail,employeeEmail,orderDate,estimatedOrderDate,providerId) VALUES (
              '${todayDate}',
              ${true},
              '${provider.email}',
              '${configs.getAppEmailEmployee()}',
              '${orderDate}',
              '${previewOrderDate}',
              ${order.idContato});`
      )
      .pipe(
        map(() => {
          console.log("notification logged into db");
          return true;
        }),
        catchError(err => {
          console.log("error trying to log notification into db", err);
          return new BehaviorSubject(false).asObservable();
        })
      );
  }
}
