import { CronJob } from "cron";
import * as http from "http2";

import { Observable, Observer, BehaviorSubject, forkJoin } from "rxjs";
import { map, mergeMap, tap, catchError } from "rxjs/operators";
import { AppConfigs } from "./app-configs";
import { Database } from "./db/database";
import { MigrateDb } from "./db/migrate-db";
import { EmailSender } from "./email/email-sender";
import { ApiClient } from "./http/api-client";
import { HttpClient } from "./http/http-client";
import { BuyingOrder } from "./models/buying-order.model";
import { Repository } from "./db/repository";

console.log("Buying Order Agent is starting...");
const [jwtKey] = process.argv.slice(2);

let server: http.Http2Server;
let cronJob: CronJob;
const httpClient = new HttpClient(jwtKey, "inspirehome.eccosys.com.br");
const apiClient = new ApiClient(httpClient);

process.on("message", msg => {
  if (msg === "shutdown") {
    shutdown();
  }
});

process.on("SIGINT", () => {
  shutdown();
});

const configs = new AppConfigs()
  .setDbAppUser("buyingorderagent")
  .setDbRootUser("root")
  .setDbRootPassword("pass")
  .setDbHost("localhost")
  .setAppDatabase("INSPIRE_HOME")
  .setAppDbPassword("123")
  .setAppCronPattern("0,5,10,15,20,25,30,35,40,45,50,55 * * * * *")
  .setAppCronTimezone("America/Sao_Paulo")
  .setAppServerHost("0.0.0.0")
  .setAppServerPort(8888)
  .setAppSMTPSecure(false)
  .setAppEmailName("viola.von@ethereal.email")
  .setAppEmailUser("viola.von@ethereal.email")
  .setAppEmailSubject("Aviso de atraso")
  .setAppEmailPassword("Q61Z2qsRsmg7nUEzNG")
  .setAppEmailEmployee("test@test.com");

const db = new Database({
  database: configs.getAppDatabase(),
  host: configs.getDbHost(),
  password: configs.getAppDbPassword(),
  user: configs.getDbAppUser()
});

MigrateDb.init(configs).subscribe(() => {
  startServer().subscribe(
    () => {
      console.log("Buying Order Agent server has started.");
      db.init();
      runOrdersVerification(db).subscribe(() => {});
      startCron();
    },
    err => {
      console.error("server startup error", err);
    }
  );
});

function startCron(): void {
  cronJob = new CronJob(
    configs.getAppCronPattern(),
    () => {
      console.log("Running Cron job");
      runOrdersVerification(db).subscribe(() => {
        console.log("orders verified");
      });
    },
    undefined,
    true,
    configs.getAppCronTimezone()
  );

  cronJob.start();
}

function startServer(): Observable<void> {
  server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.write(`running`);
    res.end();
  });

  return Observable.create((observer: Observer<any>) => {
    server.listen(
      configs.getAppServerPort(),
      configs.getAppServerHost(),
      () => {
        observer.next(0);
      }
    );
    server.on("error", err => observer.error(err));
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
      const observables = orders.map(order => {
        return apiClient.fetchProviderById(order.idContato).pipe(
          tap(provider => {
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
  console.log("Buying Order Agent is shutting down");
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
