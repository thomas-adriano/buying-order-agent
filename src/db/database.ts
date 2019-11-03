import * as mysql from 'mysql';
import { Observable, Observer } from 'rxjs';

export class Database {
  private connection: mysql.Connection;

  constructor(private cfg: mysql.ConnectionConfig) {}

  public init(): void {
    this.connection = mysql.createConnection(this.cfg);
    this.connection.connect();
    this.connection.on('end', () => {
      console.log('database: connection end');
    });
    console.log('database: connection established');
  }

  public execute(stmt: string): Observable<any> {
    console.log(`database: preparing to execute ${stmt}`);
    return Observable.create((observer: Observer<any>) => {
      try {
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

  public end(): void {
    this.connection.end();
  }

  public destroy(): void {
    this.connection.destroy();
  }
}
