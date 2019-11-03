import * as http from 'http';
import { Observable, Observer, Subject } from 'rxjs';
import * as url from 'url';
import { AppConfigs } from '../app-configs';

export interface IServerConfigs {
  appHost: string;
  appPort: number;
  dbAppUser: string;
  dbRootUser: string;
  dbRootPassword: string;
  dbHost: string;
  appDatabase: string;
  dbAppPassword: string;
}

export class HttpServer {
  private server: http.Server;
  private agentRunSubject = new Subject<void>();
  private configSavedSubject = new Subject<AppConfigs>();

  constructor(private configs: IServerConfigs) {}

  public startServer(): Observable<void> {
    this.server = http.createServer((req, res) => {
      const pathName = url.parse(req.url as any).pathname;
      if (req.method === 'OPTIONS') {
        this.writeResponseHeaders(req, res);
        res.end();
      }
      if (req.method === 'POST') {
        this.writeResponseHeaders(req, res);
        if (pathName === '/configuration') {
          console.log('http-server: configurations saved');
          const body = this.parseBody(req);
          req.on('end', () => {
            const json = JSON.parse(body);
            res.write(
              JSON.stringify({
                status: 200,
                msg: 'Configurations saved'
              })
            );
            res.end();
            const c = new AppConfigs()
              .setAppCronPattern(json.appCronPattern)
              .setAppCronTimezone(json.appCronTimezone)
              .setAppServerHost(json.appServerHost)
              .setAppServerPort(json.appServerPort)
              .setAppSMTPSecure(json.appSMTPSecure)
              .setAppEmailName(json.appEmailName)
              .setAppEmailUser(json.appEmailUser)
              .setAppEmailSubject(json.appEmailSubject)
              .setAppEmailPassword(json.appEmailPassword)
              .setAppEmailFrom(json.appEmailFrom);
            this.configSavedSubject.next(c);
          });
        }
      }

      if (req.method === 'GET') {
        this.writeResponseHeaders(req, res);
        if (pathName === '/start-agent') {
          this.agentRunSubject.next();
          res.write(
            JSON.stringify({
              status: 200,
              msg: 'agent started'
            })
          );
          res.end();
        }

        if (pathName === '/status') {
          res.write(
            JSON.stringify({
              status: 200,
              msg: 'running'
            })
          );
          res.end();
        }
      }
    });

    return Observable.create((observer: Observer<any>) => {
      this.server.listen(this.configs.appPort, this.configs.appHost, () => {
        console.log('http-server: started');
        observer.next(0);
      });
      this.server.on('error', err => {
        observer.error(err);
        console.error('http-server: error');
      });
    });
  }

  public agentRun(): Observable<void> {
    return this.agentRunSubject.asObservable();
  }

  public configurationSaved(): Observable<AppConfigs> {
    return this.configSavedSubject.asObservable();
  }

  public shutdown(): void {
    if (this.server) {
      this.server.close();
    }
  }

  private parseBody(req: http.IncomingMessage): string {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    return body;
  }

  private writeResponseHeaders(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': req.headers.origin,
      'Access-Control-Allow-Methods': 'POST, PUT, GET, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'content-type'
    });
  }
}
