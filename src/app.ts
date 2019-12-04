import "moment/locale/pt-br";
import { Subscription } from "rxjs";
import { Cron } from "./cron/cron";
import { Database } from "./db/database";
import { MigrateDb } from "./db/migrate-db";
import { Repository } from "./db/repository";
import { ApiClient } from "./http/api-client";
import { HttpClient } from "./http/http-client";
import { HttpServer } from "./http/http-server";
import { NotificationScheduler } from "./notification-scheduler";
import { AppStatusHandler } from "./websocket/app-status-handler";
import { Statuses } from "./websocket/statuses";
import { WebsocketServer } from "./websocket/websocket-server";
import { ServerConfigsService } from "./server-configs.service";

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
const serverConfigs = ServerConfigsService.getInstance().configs;

statusHandler.init();
statusHandler.changeStatus(Statuses.INITIALIZING);

const httpClient = new HttpClient(serverConfigs.apiJwt, serverConfigs.apiUrl);
const apiClient = new ApiClient(httpClient);
const appDb = new Database({
  database: serverConfigs.appDatabase,
  host: serverConfigs.dbHost,
  password: serverConfigs.dbAppPassword,
  user: serverConfigs.dbAppUser,
  port: serverConfigs.dbPort
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
    console.log("app: migration complete");
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
            serverConfigs,
            cron,
            apiClient,
            repository,
            statusHandler
          );
          notificationShcedulerSubscriber = notificationShceduler
            .start()
            .subscribe(
              total => {
                console.log(`app: ${total} orders verified`);
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
