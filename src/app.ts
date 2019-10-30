import { CronJob } from 'cron';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map, mergeMap, tap, catchError } from 'rxjs/operators';
import { AppConfigs } from './app-configs';
import { Database } from './db/database';
import { MigrateDb } from './db/migrate-db';
import { EmailSender } from './email/email-sender';
import { ApiClient } from './http/api-client';
import { HttpClient } from './http/http-client';
import { Repository } from './db/repository';
import { HttpServer } from './http/http-server';

console.log('Buying Order Agent is starting...');
const [jwtKey] = process.argv.slice(2);

let cronJob: CronJob;
const httpClient = new HttpClient(jwtKey, 'inspirehome.eccosys.com.br');
const apiClient = new ApiClient(httpClient);

process.on('message', msg => {
  if (msg === 'shutdown') {
    shutdown();
  }
});

process.on('SIGINT', () => {
  shutdown();
});

const configs = new AppConfigs()
  .setDbAppUser('buyingorderagent')
  .setDbRootUser('root')
  .setDbRootPassword('pass')
  .setDbHost('localhost')
  .setAppDatabase('INSPIRE_HOME')
  .setDbAppPassword('123')
  .setAppCronPattern('0,5,10,15,20,25,30,35,40,45,50,55 * * * * *')
  .setAppCronTimezone('America/Sao_Paulo')
  .setAppServerHost('0.0.0.0')
  .setAppServerPort(8888)
  .setAppSMTPSecure(false)
  .setAppEmailName('viola.von@ethereal.email')
  .setAppEmailUser('viola.von@ethereal.email')
  .setAppEmailSubject('Aviso de atraso')
  .setAppEmailPassword('Q61Z2qsRsmg7nUEzNG')
  .setAppEmailFrom('test@test.com');

const httpServer = new HttpServer(configs);

const db = new Database({
  database: configs.getAppDatabase(),
  host: configs.getDbHost(),
  password: configs.getDbAppPassword(),
  user: configs.getDbAppUser()
});

MigrateDb.init(configs).subscribe(() => {
  httpServer.startServer().subscribe(
    () => {
      console.log('Buying Order Agent server has started.');
      // db.init();
      // runOrdersVerification(db).subscribe(() => {});
      // startCron();
    },
    err => {
      console.error('server startup error', err);
    }
  );
});

function startCron(): void {
  cronJob = new CronJob(
    configs.getAppCronPattern(),
    () => {
      console.log('Running Cron job');
      runOrdersVerification(db).subscribe(
        () => {
          console.log('orders verified');
        },
        err => console.error(err)
      );
    },
    undefined,
    true,
    configs.getAppCronTimezone()
  );

  cronJob.start();
}

function runOrdersVerification(db: Database): Observable<boolean> {
  const repository = new Repository(db);
  const emailSender = new EmailSender({
    host: configs.getAppSMTPAddress(),
    port: configs.getAppSMTPPort(),
    secure: configs.getAppSMTPSecure(), // true for 465, false for other ports
    auth: {
      user: configs.getAppEmailUser(), // generated ethereal user
      pass: configs.getAppEmailPassword() // generated ethereal password
    }
  });

  return apiClient.fetchBuyingOrders().pipe(
    mergeMap(orders => {
      const observables = orders.map((order, i) => {
        console.log(`${i} of ${orders.length} orders processed`);
        return apiClient.fetchProviderById(order.idContato).pipe(
          tap(provider => {
            console.log(provider && provider.email);
            repository
              .persistNotificationLog(provider, order, configs)
              .subscribe(persisted => {});
            // emailSender.sendEmail("viola.von@ethereal.email", configs);
          })
        );
      });
      return forkJoin(observables).pipe(
        map(() => true),
        catchError(err => new BehaviorSubject(false).asObservable())
      );
    })
  );
}

function shutdown(): void {
  console.log('Buying Order Agent is shutting down');
  if (db) {
    db.destroy();
  }
  if (cronJob) {
    cronJob.stop();
  }
  if (httpServer) {
    httpServer.shutdown();
  }
}
