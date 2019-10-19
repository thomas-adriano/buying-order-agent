import { CronJob } from "cron";
import * as http from "http2";
import * as mysql from "mysql";
import { Observable, Observer } from "rxjs";
import { map, last } from "rxjs/operators";
import { ApiClient } from "./api-client";
import { Database } from "./database";
import { EmailSender } from "./email-sender";
import { HttpClient } from "./http-client";
import { MigrateDb } from "./migrate-db";
import * as moment from "moment";
import { BuyingOrder } from "./buying-order.model";

console.log("Buying Order Agent is starting...");

const [jwtKey, employeeEmail] = process.argv.slice(2);

let server: http.Http2Server;
let cronJob: CronJob;
let db: Database;
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

const dbConfigs: mysql.ConnectionConfig = {
  host: "localhost",
  user: "buyingorderagent",
  password: "123",
  database: "INSPIRE_HOME"
};

MigrateDb.init(dbConfigs).subscribe(() => {
  startServer().subscribe(
    () => {
      console.log("Buying Order Agent server has started.");
      runOrdersVerification().subscribe(() => {
        console.log("orders verified");
      });
      startCron();
    },
    err => {
      console.error("server startup error");
    }
  );
});

function startCron(): void {
  cronJob = new CronJob(
    "0,5,10,15,20,25,30,35,40,45,50,55 * * * * *",
    () => {
      console.log("Running Cron job");
      runOrdersVerification().subscribe(() => {
        console.log("orders verified");
      });
    },
    undefined,
    true,
    "America/Sao_Paulo"
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
    server.listen(8888, "0.0.0.0", () => {
      observer.next(0);
    });
    server.on("error", err => observer.error(err));
  });
}

function runOrdersVerification(): Observable<void> {
  db = new Database(dbConfigs);

  const emailSender = new EmailSender({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "viola.von@ethereal.email", // generated ethereal user
      pass: "Q61Z2qsRsmg7nUEzNG" // generated ethereal password
    }
  });

  return apiClient.fetchBuyingOrders().pipe(
    map(orders => {
      persistNotificationLog(orders[0]);
      // create reusable transporter object using the default SMTP transport
      emailSender.sendEmail({
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "viola.von@ethereal.email", // list of receivers
        subject: "Hello ✔", // Subject line
        text: orders
          .map(o => `${o.idContato} - ${o.nomeContato}`)
          .reduce((a, b) => (a += b)), // plain text body
        html: "<b>Hello world?</b>" // html body
      });
    })
  );
}

function persistNotificationLog(order: BuyingOrder): void {
  db.init();
  apiClient.fetchProviderById(order.idContato).subscribe(provider => {
    db.execute(
      `INSERT INTO \`INSPIRE_HOME\`.\`order-notification\` (timestamp,sent,customerEmail,employeeEmail) VALUES (
        '${moment.utc(new Date()).format("YYYY/MM/DD HH:mm:ss")}',
        ${true},
        '${provider.email}',
        '${employeeEmail}');`
    ).subscribe(
      () => console.log("notification logged into db"),
      err => {
        console.log("error trying to log notification into db", err);
        shutdown();
      }
    );
    db.end();
  });
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
