import * as mysql from "mysql";
import { Observable, Observer, Subject, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

export class Database {
  private connection: mysql.Connection | undefined;
  private disconnectTimeout: NodeJS.Timeout | undefined;
  private disconnectTimeoutValue = 1000;
  private connecting = false;
  private connSubject = new Subject<mysql.Connection>();

  constructor(private cfg: mysql.ConnectionConfig) {}

  public execute(stmt: string): Observable<any> {
    const subject = new Subject<any>();
    this.getConnection().subscribe(
      conn => {
        conn.query(stmt, (error, results, fields) => {
          if (error) {
            subject.error(error);
            return;
          }
          // console.log(`database: ${stmt.slice(0, 52)}`);
          subject.next(results[0]);
          subject.complete();
        });
      },
      catchError(err => {
        console.error("database: error executing sql stmt", err);
        return throwError(err);
      }),
      () => subject.complete()
    );
    return subject.asObservable();
  }

  public end(): Observable<any> {
    console.log(`database: closing db connection`);
    return Observable.create((observer: Observer<any>) => {
      try {
        if (this.connection) {
          this.connection.end(err => {
            if (err) {
              console.error(`database: fail closing db connection`);
              observer.error(err);
            } else {
              observer.next(true);
              observer.complete();
            }
          });
          this.connection = undefined;
        } else {
          observer.next(false);
          observer.complete();
        }
      } catch (e) {
        console.error(`database: could not close connection`);
        observer.error(e);
      }
    });
  }

  public destroy(): void {
    if (this.connection) {
      console.log(`database: db connection destroyed`);
      this.connection.destroy();
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
      (!this.connection || this.connection.state !== "connected") &&
      !this.connecting
    ) {
      this.connecting = true;
      this.end().subscribe(() => {
        this.connection = mysql.createConnection(this.cfg);
        this.connection.connect(err => {
          this.connecting = false;
          if (err) {
            console.error(err);
            this.connSubject.error(err);
          } else {
            this.restartDcTimeout();
            this.connSubject.next(this.connection);
            this.connecting = false;
            console.log("database: connection established");
          }
        });

        this.connection.on("end", () => {
          console.log("database: connection end");
          this.clearDcTimeout();
        });
      });
    } else if (this.connection && this.connection.state !== "disconnected") {
      this.connSubject.next(this.connection);
    }
    return this.connSubject.asObservable();
  }
}
