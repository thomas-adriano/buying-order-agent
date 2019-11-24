import moment from "moment";
import {
  BehaviorSubject,
  forkJoin,
  Observable,
  Observer,
  Subject,
  Subscription,
  throwError,
  EMPTY,
  of,
  Subscriber,
  zip,
  concat
} from "rxjs";
import {
  catchError,
  filter,
  finalize,
  map,
  mergeMap,
  tap
} from "rxjs/operators";
import { AppConfigs } from "./app-configs";
import { Cron } from "./cron/cron";
import { Repository } from "./db/repository";
import { EmailSender } from "./email/email-sender";
import { ApiClient } from "./http/api-client";
import { BuyingOrder } from "./models/buying-order.model";
import { Provider } from "./models/provider.model";
import { AppStatusHandler } from "./websocket/app-status-handler";
import { Statuses } from "./websocket/statuses";

export interface IProviderAndOrder {
  provider: Provider;
  order: BuyingOrder;
}

export class NotificationScheduler {
  private executing = false;
  private subscriptions = new Subscriber();
  private emailSender: EmailSender;

  constructor(
    private configs: AppConfigs,
    private cron: Cron,
    private apiClient: ApiClient,
    private repository: Repository,
    private statusHandler: AppStatusHandler
  ) {
    this.emailSender = new EmailSender({
      host: this.configs.getAppSMTPAddress(),
      port: this.configs.getAppSMTPPort(),
      secure: this.configs.getAppSMTPSecure(),
      auth: {
        user: this.configs.getAppEmailUser(),
        pass: this.configs.getAppEmailPassword()
      }
    });
  }

  public stop(): void {
    if (this.cron && this.cron.isRunning()) {
      console.log("notification-scheduler: stoping scheduler");
      this.cron.stop();
      if (this.subscriptions) {
        this.subscriptions.unsubscribe();
      }
    }
  }

  public start(): Observable<any> {
    console.log("notification-scheduler: starting scheduler");
    this.stop();
    this.statusHandler.changeStatus(Statuses.SCHEDULER_RUNNING);
    const subject = new Subject();
    this.runOrdersVerification().subscribe({
      error: err => subject.error(err),
      complete: () => {
        subject.next();
        this.cron.start().subscribe(() => {
          this.runOrdersVerification().subscribe({
            complete: () => subject.next()
          });
        });
      }
    });

    return subject.asObservable();
  }

  private runOrdersVerification(): Observable<number> {
    console.log(
      "notification-scheduler: preparing to execute orders verification"
    );
    if (this.executing) {
      console.warn("notification-scheduler: already runnig");
      return new BehaviorSubject(0);
    }
    this.executing = true;

    const subject = new Subject<number>();
    this.fetchProvidersAndOrders().subscribe(providersAndOrders => {
      const total = providersAndOrders.length;
      let count = 0;
      for (let i = 0; i < total; i++) {
        console.log(
          `notification-scheduler: preparing e-mail from order ${i +
            1} from ${total}`
        );
        const entry = providersAndOrders[i];
        if (!entry.provider.email) {
          this.persistNotificationNotSent(
            entry.order,
            entry.provider
          ).subscribe(
            () => {
              count++;
              console.log(
                `notification-scheduler: logging notification ${i +
                  1} from ${total} NOT sent into db`
              );
              if (count === total) {
                subject.next(count);
                subject.complete();
              }
            },
            err => {
              count++;
              if (count === total) {
                subject.next(count);
                subject.complete();
              }
            }
          );
        } else {
          this.sendEmail(entry).subscribe(
            p => {
              count++;
              console.log(
                `notification-scheduler: logging notification ${
                  entry.order.id
                } ${i + 1} from ${total} sent into db`
              );
              if (count === total) {
                subject.next(count);
                subject.complete();
              }
            },
            e => {
              console.error("notification-scheduler: error logging into db");
              count++;
              if (count === total) {
                subject.next(count);
                subject.complete();
              }
              return throwError(e);
            }
          );
        }
      }
    });
    subject.subscribe({ complete: () => (this.executing = false) });
    return subject.asObservable();
  }

  private sendEmail(entry: IProviderAndOrder): Observable<any> {
    console.log(`notification-scheduler: sending e-mail ${entry.order.id}`);
    return this.emailSender
      .sendEmail("viola.von@ethereal.email", this.configs)
      .pipe(
        mergeMap(() => {
          console.log(
            `notification-scheduler: e-mail from order ${entry.order.id}} sent`
          );
          return this.persistNotificationSent(entry.order, entry.provider).pipe(
            tap(() =>
              console.log("notification-scheduler: notification logged")
            )
          );
        }),
        catchError(err => {
          console.error("notification-scheduler: error sending email");
          this.persistNotificationNotSent(
            entry.order,
            entry.provider
          ).subscribe(
            () => console.log("notification-scheduler: notification logged"),

            () =>
              console.log("notification-scheduler: error logging notification")
          );
          return throwError(err);
        })
      );
  }

  private persistNotificationNotSent(
    order: BuyingOrder,
    provider: Provider
  ): Observable<any> {
    return this.repository.persistNotificationLog(
      provider,
      order,
      this.configs.getAppEmailFrom(),
      false
    );
  }

  private persistNotificationSent(
    order: BuyingOrder,
    provider: Provider
  ): Observable<boolean> {
    return this.repository.persistNotificationLog(
      provider,
      order,
      this.configs.getAppEmailFrom(),
      true
    );
  }

  private fetchProvidersAndOrders(): Observable<IProviderAndOrder[]> {
    return this.fetchBuyingOrders().pipe(
      mergeMap(orders => {
        const ordersCount = orders.length;
        const subject = new BehaviorSubject<IProviderAndOrder[]>([]);
        console.log(`notification-scheduler: ${ordersCount} orders filtered`);
        const ret: IProviderAndOrder[] = [];
        const total = orders.length;
        let count = 0;
        orders.forEach(o => {
          this.fetchProvidersById(o.idContato).subscribe(
            provider => {
              count++;
              ret.push({ order: o, provider });
              console.log(
                `notification-scheduler: provider infos ${count} from ${total} fetched. Order n. ${o.id}`
              );
              if (count === total) {
                console.log(
                  "notification-scheduler: fetching provider finished"
                );
                subject.next(ret);
                subject.complete();
              }
            },
            err => {
              console.error(
                `notification-scheduler: ERROR fetching provider infos ${count}. Order n. ${o.id}`
              );
              count++;
              if (count === total) {
                console.log(
                  "notification-scheduler: fetching provider finished"
                );
                subject.next(ret);
                subject.complete();
              }
            }
          );
        });
        return subject.asObservable();
      })
    );
  }

  private fetchBuyingOrders(): Observable<BuyingOrder[]> {
    const subject = new Subject<BuyingOrder[]>();
    const today: moment.Moment = moment();
    const orders = this.apiClient.fetchBuyingOrders().pipe(
      map(os => {
        const delta = this.configs.getAppNotificationTriggerDelta();
        console.log(
          `notification-scheduler: filtering orders ${delta} day(s) old`
        );
        return os
          .filter(o => {
            if (!o.data) {
              return false;
            }
            const orderDate = moment(o.data, "DD-MM-YYYY");
            const diff = today.diff(orderDate, "days");
            return diff > delta;
          })
          .slice(0, 100);
      })
    );
    const unprocessedOrders: BuyingOrder[] = [];
    orders.subscribe(os => {
      const total = os.length;
      let count = 0;
      os.forEach(o => {
        this.repository.isOrderAlreadyProcessed(o).subscribe(
          processed => {
            if (!processed) {
              unprocessedOrders.push(o);
            }
            count++;
            if (count === total) {
              subject.next(unprocessedOrders);
              subject.complete();
            }
          },
          err => {
            subject.error(err);
          }
        );
      });
    });
    return subject.asObservable();
  }

  private fetchProvidersById(id: string | undefined): Observable<Provider> {
    return this.apiClient.fetchProviderById(id);
  }
}
