import * as https from 'https';
import { Observable, Observer } from 'rxjs';

export class HttpClient {
  constructor(private jwtKey: string, private host: string) {}

  public get<T = any>(resource: string): Observable<T> {
    return Observable.create((observer: Observer<any>) => {
      https
        .get(
          {
            hostname: this.host,
            path: resource,
            headers: {
              Authorization: `${this.jwtKey}`,
              Accept: 'application/json',
              'Content-Type': 'application/json'
            }
          },
          resp => {
            let body = '';
            resp.on('data', chunk => {
              body += chunk;
            });
            resp.on('end', () => {
              const json = JSON.parse(body) as any[];
              observer.next(json as any);
            });
          }
        )
        .on('error', e => {
          observer.error(e);
        });
    });
  }
}
