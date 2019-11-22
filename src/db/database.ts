import * as mysql from "mysql";
import {
  Observable,
  Observer,
  BehaviorSubject,
  Subject,
  ReplaySubject
} from "rxjs";

export class Database {
  private _connection: mysql.Connection;
  private disconnectTimeout: NodeJS.Timeout | undefined;
  private disconnectTimeoutValue = 1000;
  private connecting = false;
  private connSubject = new ReplaySubject<mysql.Connection>(1);

  constructor(private cfg: mysql.ConnectionConfig) {}

  public execute(stmt: string): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
      this.restartDcTimeout();
      try {
        this.getConnection().subscribe(conn => {
          conn.query(stmt, (error, results, fields) => {
            if (error) {
              observer.error(error);
              return;
            }
            observer.next(results);
            observer.complete();
          });
        });
      } catch (e) {
        console.error("database: error executing sql stmt");
        observer.error(e);
      }
    });
  }

  public end(): Observable<any> {
    console.log(`database: closing db connection`);
    return Observable.create((observer: Observer<any>) => {
      try {
        this._connection.end(err => {
          if (err) {
            console.error(`database: fail closing db connection`);
            observer.error(err);
          } else {
            console.log(`database: db connection closed`);
            observer.next(true);
            observer.complete();
          }
        });
      } catch (e) {
        console.warn(`database: could not close connection`);
        observer.next(false);
        observer.complete();
      }
    });
  }

  public destroy(): void {
    if (this._connection) {
      console.log(`database: db connection destroyed`);
      this._connection.destroy();
    }
  }

  private restartDcTimeout(): void {
    this.clearDcTimeout();
    this.disconnectTimeout = setTimeout(() => {
      this.end().subscribe();
    }, this.disconnectTimeoutValue);
  }

  private clearDcTimeout(): void {
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = undefined;
    }
  }

  private getConnection(): Observable<mysql.Connection> {
    if (
      (!this._connection || this._connection.state === "disconnected") &&
      !this.connecting
    ) {
      this.connecting = true;
      this._connection = mysql.createConnection(this.cfg);
      this._connection.connect(err => {
        if (err) {
          this.connSubject.error(err);
        } else {
          this.connSubject.next(this._connection);
          this.connecting = false;
        }
      });
      this._connection.on("end", () => {
        console.log("database: connection end");
        this.clearDcTimeout();
      });
      this.restartDcTimeout();
      console.log("database: connection established");
    }
    this.connSubject.next(this._connection);
    return this.connSubject.asObservable();
  }
}
