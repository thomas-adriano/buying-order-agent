import { CronJob } from 'cron';
import * as http from 'http';
import * as fs from 'fs';
import { Observable, Observer, BehaviorSubject, forkJoin, EMPTY } from 'rxjs';
import { map, mergeMap, tap, catchError } from 'rxjs/operators';
import { AppConfigs } from './app-configs';
import { Database } from './db/database';
import { MigrateDb } from './db/migrate-db';
import { EmailSender } from './email/email-sender';
import { ApiClient } from './http/api-client';
import { HttpClient } from './http/http-client';
import * as url from 'url';
import { Repository } from './db/repository';

console.log('Buying Order Agent is starting...');
const [jwtKey] = process.argv.slice(2);

let server: http.Server;
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

let rawdata = fs.readFileSync('./configs.json');
let serverLocalConfigs = JSON.parse(rawdata as any);

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

const db = new Database({
  database: configs.getAppDatabase(),
  host: configs.getDbHost(),
  password: configs.getDbAppPassword(),
  user: configs.getDbAppUser()
});

MigrateDb.init(configs).subscribe(() => {
  startServer().subscribe(
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

function startServer(): Observable<void> {
  server = http.createServer((req, res) => {
    const pathName = url.parse(req.url as any).pathname;

    console.log('req', req.method);
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': serverLocalConfigs.frontendUrl,
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE',
        'Access-Control-Allow-Headers': 'content-type'
        Origin: serverLocalConfigs.frontendUrl
      });
      res.end();
    }
    if (req.method === 'POST') {
      if (pathName === '/configuration') {
        console.log('Configurations saved');
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          const json = JSON.parse(body);
          console.log(json);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.write(
            JSON.stringify({
              status: 200,
              msg: 'Configurations saved'
            })
          );
          res.end();
        });

      }
    }
  });

  return Observable.create((observer: Observer<any>) => {
    server.listen(
      configs.getAppServerPort(),
      configs.getAppServerHost(),
      () => {
        observer.next(0);
      }
    );
    server.on('error', err => observer.error(err));
  });
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
  if (server) {
    server.close();
  }
}
