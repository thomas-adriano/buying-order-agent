import * as mysql from 'mysql';
import { Observable, Observer } from 'rxjs';

export class Database {
  private connection: mysql.Connection;
  private connected = false;

  constructor(private cfg: mysql.ConnectionConfig) {}

  public init(): void {
    this.connection = mysql.createConnection(this.cfg);
  }

  public execute(stmt: string): Observable<void> {
    if (!this.connected) {
      this.connection.connect();
      this.connected = true;
    }

    return Observable.create((observer: Observer<any>) => {
      try {
        this.connection.query(stmt, (error, results, fields) => {
          if (error) {
            observer.error(error);
            return;
          }
          observer.next(results);
          observer.complete();
        });
      } catch (e) {
        observer.error(e);
      }
    });
  }

  public end(): void {
    this.connection.end();
  }

  public destroy(): void {
    this.connection.destroy();
  }
}
