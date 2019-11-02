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

      console.log('req', req.method);
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': req.headers.origin,
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
          'Access-Control-Allow-Headers': 'content-type'
        });
        res.end();
      }
      if (req.method === 'POST') {
        if (pathName === '/configuration') {
          console.log('Configurations saved');
          const body = this.parseBody(req);
          req.on('end', () => {
            const json = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
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
        if (pathName === '/start-agent') {
          this.agentRunSubject.next();
        }
      }
    });

    return Observable.create((observer: Observer<any>) => {
      this.server.listen(this.configs.appPort, this.configs.appHost, () => {
        observer.next(0);
      });
      this.server.on('error', err => observer.error(err));
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
}
