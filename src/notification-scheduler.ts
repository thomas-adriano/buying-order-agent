import moment from 'moment';
import { BehaviorSubject, Observable, Observer, zip, forkJoin } from 'rxjs';
import { catchError, finalize, map, mergeMap, tap } from 'rxjs/operators';
import { AppConfigs } from './app-configs';
import { Cron } from './cron/cron';
import { Repository } from './db/repository';
import { EmailSender } from './email/email-sender';
import { ApiClient } from './http/api-client';

export class NotificationScheduler {
  private executing = false;

  constructor(
    private configs: AppConfigs,
    private cron: Cron,
    private apiClient: ApiClient,
    private repository: Repository
  ) {}

  public stop(): void {
    console.log('notification-scheduler: stoping scheduler');
    if (this.cron && this.cron.isRunning()) {
      this.cron.stop();
    }
  }

  public start(): Observable<any> {
    this.stop();
    return Observable.create((observer: Observer<void>) => {
      this.runOrdersVerification(observer);

      this.cron.start().subscribe(() => {
        this.runOrdersVerification(observer);
      });
    });
  }

  private runOrdersVerification(observer: Observer<void>): void {
    this.doRunOrdersVerification().subscribe(
      () => {
        console.log('notification-scheduler: orders verified');
        observer.next();
      },
      err => {
        console.error(err);
        observer.error(err);
      },
      () => observer.complete()
    );
  }

  private doRunOrdersVerification(): Observable<any> {
    console.log(
      'notification-scheduler: preparing to execute orders verification'
    );
    if (this.executing) {
      return new BehaviorSubject(false);
    }
    this.executing = true;
    const emailSender = new EmailSender({
      host: this.configs.getAppSMTPAddress(),
      port: this.configs.getAppSMTPPort(),
      secure: this.configs.getAppSMTPSecure(),
      auth: {
        user: this.configs.getAppEmailUser(),
        pass: this.configs.getAppEmailPassword()
      }
    });
    const today: moment.Moment = moment();
    let ordersCount = 0;
    let currOrderCount = 0;
    return this.apiClient.fetchBuyingOrders().pipe(
      map(orders => {
        const delta = this.configs.getAppNotificationTriggerDelta();
        console.log(
          `notification-scheduler: filtering orders ${delta} day(s) old`
        );
        return orders.filter(o => {
          if (!o.data) {
            return false;
          }
          const orderDate = moment(o.data, 'DD-MM-YYYY');
          const diff = today.diff(orderDate, 'days');
          return diff > delta;
        });
      }),
      mergeMap(orders => {
        ordersCount = orders.length;
        console.log(`notification-scheduler: ${ordersCount} orders filtered`);
        // aqui virão apenas orders vencidas
        this.repository.begin();
        const observables = orders.map(order => {
          return this.apiClient.fetchProviderById(order.idContato).pipe(
            map(provider => {
              currOrderCount++;
              console.log(
                `notification-scheduler: ${currOrderCount} of ${ordersCount} orders processed`
              );
              if (provider && provider.email) {
                return emailSender
                  .sendEmail('viola.von@ethereal.email', this.configs)
                  .pipe(
                    mergeMap(() =>
                      this.repository.persistNotificationLog(
                        provider,
                        order,
                        this.configs.getAppEmailFrom(),
                        true
                      )
                    ),
                    catchError(err =>
                      this.repository.persistNotificationLog(
                        provider,
                        order,
                        this.configs.getAppEmailFrom(),
                        false
                      )
                    )
                  );
                // .subscribe(
                //   () => {
                //     this.repository
                //       .persistNotificationLog(
                //         provider,
                //         order,
                //         this.configs.getAppEmailFrom(),
                //         true
                //       )
                //       .subscribe(persisted => {});
                //       },
                //       err => {
                //         this.repository
                //           .persistNotificationLog(
                //             provider,
                //             order,
                //             this.configs.getAppEmailFrom(),
                //             false
                //           )
                //           .subscribe(persisted => {});
                //         console.error(
                //           `notification-scheduler: error trying to send notification to ${provider.fantasia}, e-mail: ${provider.email}`
                //         );
                //         console.error(err);
                //       }
                //     );
              }
              return false;
            })
          );
        });
        return forkJoin(observables).pipe(
          map((s) => {
            if (currOrderCount === ordersCount) {
              this.repository.end();
            }
            if (s) {
              s.
            }
            return true;
          }),
          catchError(err => {
            this.repository.end();
            return new BehaviorSubject(false).asObservable();
          }),
          finalize(() => (this.executing = false))
        );
      })
    );
  }
}
