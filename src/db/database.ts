import * as mysql from 'mysql';
import { Observable, Observer, BehaviorSubject } from 'rxjs';

export class Database {
  private connection: mysql.Connection;

  constructor(private cfg: mysql.ConnectionConfig) {}

  public init(): void {
    this.end().subscribe(() => {
      this.connection = mysql.createConnection(this.cfg);
      this.connection.connect();
      this.connection.on('end', () => {
        console.log('database: connection end');
      });
      console.log('database: connection established');
    });
  }

  public execute(stmt: string): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
      try {
        // console.log(`database: preparing to execute ${stmt}`);
        this.connection.query(stmt, (error, results, fields) => {
          if (error) {
            observer.error(error);
            return;
          }
          console.log('database: stmt successfully executed');
          observer.next(results);
          observer.complete();
        });
      } catch (e) {
        console.error('database: error executing sql stmt');
        observer.error(e);
      }
    });
  }

  public end(): Observable<any> {
    console.log(`database: closing db connection`);
    if (this.connection && this.connection.state === 'connected') {
      return Observable.create((observer: Observer<any>) => {
        this.connection.end(err => {
          if (err) {
            observer.error(err);
          } else {
            console.log(`database: db connection closed`);
            observer.next(true);
          }
        });
      });
    }
    return new BehaviorSubject(false);
  }

  public destroy(): void {
    if (this.connection) {
      console.log(`database: db connection destroyed`);
      this.connection.destroy();
    }
  }
}
