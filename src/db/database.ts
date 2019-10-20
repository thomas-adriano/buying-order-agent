import * as mysql from "mysql";
import { Observable, Observer } from "rxjs";

export class Database {
  private connection: mysql.Connection;
  private connected = false;

  constructor(private cfg: mysql.ConnectionConfig) {}

  public init(): void {
    if (this.connection) {
      return;
    }
    this.connection = mysql.createConnection(this.cfg);
  }

  public execute(stmt: string): Observable<void> {
    if (!this.connected) {
      this.connection.connect();
      this.connected = true;
    }

    return Observable.create((observer: Observer<any>) => {
      this.connection.query(stmt, (error, results, fields) => {
        if (error) {
          observer.error(error);
          return;
        }
        observer.next(results);
        observer.complete();
      });
    });
  }

  public end(): void {
    this.connection.end();
    this.connected = false;
  }

  public destroy(): void {
    this.connection.destroy();
    this.connected = false;
  }
}
