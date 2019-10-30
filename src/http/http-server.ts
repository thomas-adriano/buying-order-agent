import { Observable, Observer } from 'rxjs';
import * as http from 'http';
import * as url from 'url';
import { AppConfigs } from '../app-configs';

export interface ServerConfigs {
  frontendUrl: string;
}

export class HttpServer {
  private server: http.Server;

  constructor(private readonly configs: AppConfigs) {}

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
      this.server.listen(
        this.configs.getAppServerPort(),
        this.configs.getAppServerHost(),
        () => {
          observer.next(0);
        }
      );
      this.server.on('error', err => observer.error(err));
    });
  }

  public shutdown(): void {
    if (this.server) {
      this.server.close();
    }
  }
}
