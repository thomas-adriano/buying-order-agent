import * as fs from 'fs';
import * as path from 'path';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { AppConfigs } from './app-configs';
import { Cron } from './cron/cron';
import { Database } from './db/database';
import { MigrateDb } from './db/migrate-db';
import { Repository } from './db/repository';
import { EmailSender } from './email/email-sender';
import { ApiClient } from './http/api-client';
import { HttpClient } from './http/http-client';
import { HttpServer, IServerConfigs } from './http/http-server';
import { AppStatusHandler } from './websocket/app-status-handler';
import { Statuses } from './websocket/statuses';
import { WebsocketServer } from './websocket/websocket-server';

console.log('app: buying-order-agent is starting...');

process.on('message', msg => {
  if (msg === 'shutdown') {
    shutdown();
  }
});

process.on('SIGINT', () => {
  shutdown();
});

const [jwtKey] = process.argv.slice(2);

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

const websocketServer = new WebsocketServer();
const statusHandler = new AppStatusHandler(websocketServer);

statusHandler.init();
statusHandler.changeStatus(Statuses.INITIALIZING);

const httpClient = new HttpClient(jwtKey, 'inspirehome.eccosys.com.br');
const apiClient = new ApiClient(httpClient);
const serverConfigs = loadServerConfigs();
const appDb = new Database({
  database: serverConfigs.appDatabase,
  host: serverConfigs.dbHost,
  password: serverConfigs.dbAppPassword,
  user: serverConfigs.dbAppUser
});
const rootDb = new Database({
  host: serverConfigs.dbHost,
  password: serverConfigs.dbRootPassword,
  user: serverConfigs.dbRootUser
});
const repository = new Repository(appDb, serverConfigs);
const migrator = new MigrateDb(serverConfigs, rootDb);
const httpServer = new HttpServer(serverConfigs);
let cron: Cron;

rootDb.init();
migrator.init().subscribe(
  () => {
    rootDb.end();
    console.log('Database migration completed successfully!');
    httpServer.startServer().subscribe(() => {
      statusHandler.changeStatus(Statuses.SERVER_RUNNING);
      httpServer.configurationSaved().subscribe(configs => {
        appDb.init();
        repository
          .persistConfiguration(configs)
          .subscribe(() => console.log('configurations saved to database'));
        appDb.end();
      });

      httpServer.agentRun().subscribe(() => {
        appDb.init();
        repository.getConfiguration().subscribe(config => {
          appDb.end();
          runOrdersVerification(config).subscribe(
            () => {
              console.log('orders verified');
              cron = startCron(config);
              statusHandler.changeStatus(Statuses.SCHEDULER_RUNNING);
            },
            err => {
              console.error(err);
            }
          );
        });
      });
    });
  },
  err => {
    rootDb.end();
  }
);

function startCron(configs: AppConfigs): Cron {
  const cron = new Cron(configs);
  cron.start().subscribe(() => {
    runOrdersVerification(configs).subscribe(
      () => {
        console.log('orders verified');
      },
      err => console.error(err)
    );
  });
  return cron;
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
      appDb.init();
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
        map(() => {
          appDb.end();
          return true;
        }),
        catchError(err => {
          appDb.end();
          return new BehaviorSubject(false).asObservable();
        })
      );
    })
  );
}

function shutdown(): void {
  statusHandler.changeStatus(Statuses.FINALIZING);
  console.log('Buying Order Agent is shutting down');
  if (appDb) {
    appDb.destroy();
  }
  if (cron) {
    cron.stop();
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
