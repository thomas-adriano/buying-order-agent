import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { AppConfigs } from './app-configs';
import { Database } from './db/database';
import { MigrateDb } from './db/migrate-db';
import { Repository } from './db/repository';
import { EmailSender } from './email/email-sender';
import { ApiClient } from './http/api-client';
import { HttpClient } from './http/http-client';
import { HttpServer, IServerConfigs } from './http/http-server';

console.log('Buying Order Agent is starting...');

process.on('message', msg => {
  if (msg === 'shutdown') {
    shutdown();
  }
});

process.on('SIGINT', () => {
  shutdown();
});

const [jwtKey] = process.argv.slice(2);

let cronJob: CronJob;
const httpClient = new HttpClient(jwtKey, 'inspirehome.eccosys.com.br');
const apiClient = new ApiClient(httpClient);

// const configs = new AppConfigs()

//   .setAppCronPattern('0,5,10,15,20,25,30,35,40,45,50,55 * * * * *')
//   .setAppCronTimezone('America/Sao_Paulo')
//   .setAppServerHost('0.0.0.0')
//   .setAppServerPort(8888)
//   .setAppSMTPSecure(false)
//   .setAppEmailName('viola.von@ethereal.email')
//   .setAppEmailUser('viola.von@ethereal.email')
//   .setAppEmailSubject('Aviso de atraso')
//   .setAppEmailPassword('Q61Z2qsRsmg7nUEzNG')
//   .setAppEmailFrom('test@test.com');

const serverConfigs = loadServerConfigs();

const db = new Database({
  database: serverConfigs.appDatabase,
  host: serverConfigs.dbHost,
  password: serverConfigs.dbAppPassword,
  user: serverConfigs.dbAppUser
});
const repository = new Repository(db, serverConfigs);

const httpServer = new HttpServer(serverConfigs);

MigrateDb.init(serverConfigs).subscribe(() => {
  console.log('Database migration completed successfully!');
  httpServer.startServer().subscribe(() => {
    httpServer.configurationSaved().subscribe(configs => {
      repository
        .persistConfiguration(configs)
        .subscribe(() => console.log('configurations saved to database'));
    });

    httpServer.agentRun().subscribe(() => {
      repository.getConfiguration().subscribe(config => {
        runOrdersVerification(config).subscribe(
          () => {
            console.log('orders verified');
            startCron(config);
          },
          err => console.error(err)
        );
      });
    });
  });
});

function startCron(configs: AppConfigs): void {
  cronJob = new CronJob(
    configs.getAppCronPattern(),
    () => {
      console.log('Running Cron job');
      runOrdersVerification(configs).subscribe(
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

function runOrdersVerification(configs: AppConfigs): Observable<boolean> {
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
              .persistNotificationLog(
                provider,
                order,
                configs.getAppEmailFrom()
              )
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

function loadServerConfigs(): IServerConfigs {
  const p = `${__dirname}${path.sep}server.json`;
  console.log(`app: reading serverConfigs from ${p}`);
  const fc = fs.readFileSync(p, 'utf8');
  console.log(`app: serverConfigs file loaded ${fc}`);
  const c = JSON.parse(fc) as IServerConfigs;
  return c;
}
