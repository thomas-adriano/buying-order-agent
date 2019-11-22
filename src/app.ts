import * as fs from "fs";
import moment from "moment";
import "moment/locale/pt-br";
import * as path from "path";
import {
  BehaviorSubject,
  forkJoin,
  Observable,
  Subscriber,
  Subscription
} from "rxjs";
import { catchError, map, mergeMap, tap } from "rxjs/operators";
import { AppConfigs } from "./app-configs";
import { Cron } from "./cron/cron";
import { Database } from "./db/database";
import { MigrateDb } from "./db/migrate-db";
import { Repository } from "./db/repository";
import { EmailSender } from "./email/email-sender";
import { ApiClient } from "./http/api-client";
import { HttpClient } from "./http/http-client";
import { HttpServer, IServerConfigs } from "./http/http-server";
import { AppStatusHandler } from "./websocket/app-status-handler";
import { Statuses } from "./websocket/statuses";
import { WebsocketServer } from "./websocket/websocket-server";
import { NotificationScheduler } from "./notification-scheduler";

console.log("app: buying-order-agent is starting...");

process.on("message", msg => {
  if (msg === "shutdown") {
    shutdown();
  }
});

process.on("SIGINT", () => {
  shutdown();
});

const websocketServer = new WebsocketServer();
const statusHandler = new AppStatusHandler(websocketServer);

statusHandler.init();
statusHandler.changeStatus(Statuses.INITIALIZING);

const serverConfigs = loadServerConfigs();
const httpClient = new HttpClient(serverConfigs.apiJwt, serverConfigs.apiUrl);
const apiClient = new ApiClient(httpClient);
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
const httpServer = new HttpServer(serverConfigs, repository);
let notificationShceduler: NotificationScheduler;
let notificationShcedulerSubscriber: Subscription;

migrator.init().subscribe(
  () => {
    httpServer.startServer().subscribe(() => {
      statusHandler.changeStatus(Statuses.SERVER_RUNNING);
      httpServer.configurationSaved().subscribe(configs => {
        repository.persistConfiguration(configs).subscribe(() => {
          console.log("app: configurations saved to database");
        });
      });

      httpServer.agentRun().subscribe(() => {
        console.log(`app: running scheduler`);
        repository.getConfiguration().subscribe(config => {
          if (notificationShceduler) {
            notificationShceduler.stop();
          }
          const cron = new Cron(config);
          notificationShceduler = new NotificationScheduler(
            config,
            cron,
            apiClient,
            repository,
            statusHandler
          );
          notificationShcedulerSubscriber = notificationShceduler
            .start()
            .subscribe(
              () => {
                console.log("app: orders verified");
              },
              err => {
                console.error(err);
                statusHandler.changeStatus(Statuses.SCHEDULER_ERROR);
              },
              () => console.log("app: notificationShceduler completed")
            );
        });
      });

      httpServer.agentStop().subscribe(() => {
        statusHandler.changeStatus(Statuses.SERVER_RUNNING);
        notificationShceduler.stop();
        notificationShcedulerSubscriber.unsubscribe();
        console.log("app: stoping");
      });
    });
  },
  err => {
    console.error("app: an error occurred while executing migrateDb");
    console.error(err);
  }
);

function shutdown(): void {
  statusHandler.changeStatus(Statuses.FINALIZING);
  console.log("Buying Order Agent is shutting down");
  if (appDb) {
    appDb.destroy();
  }
  if (notificationShceduler) {
    notificationShceduler.stop();
  }
  if (httpServer) {
    httpServer.shutdown();
  }
  if (websocketServer) {
    websocketServer.close();
  }
}

function loadServerConfigs(): IServerConfigs {
  const p = `${__dirname}${path.sep}server.json`;
  console.log(`app: reading serverConfigs from ${p}`);
  const fc = fs.readFileSync(p, "utf8");
  console.log(`app: serverConfigs file loaded ${fc}`);
  const c = JSON.parse(fc) as IServerConfigs;
  return c;
}
