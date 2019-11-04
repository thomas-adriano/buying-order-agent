import { BehaviorSubject, forkJoin, Observable, zip, of } from 'rxjs';
import { catchError, map, tap, mergeMap } from 'rxjs/operators';
import { IServerConfigs } from '../http/http-server';
import { Database } from './database';

export class MigrateDb {
  constructor(private configs: IServerConfigs, private db: Database) {}

  public init(): Observable<any> {
    console.log(`migration: starting`);
    return zip(
      this.createDb(),
      this.createTables(),
      this.createUser().pipe(mergeMap(ran => this.grantPermissions()))
    ).pipe(
      tap(() =>
        console.log('migration: database migration completed successfully!')
      )
    );
  }

  private createTables(): Observable<boolean[]> {
    try {
      return forkJoin(
        this.db
          .execute(
            `CREATE TABLE IF NOT EXISTS \`${this.configs.appDatabase}\`.\`order-notification\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`providerId\` INT NOT NULL,
            \`timestamp\` DATETIME NOT NULL,
            \`sent\` BOOL,
            \`orderDate\` DATE,
            \`estimatedOrderDate\` DATE,
            \`providerEmail\` VARCHAR(128),
            \`employeeEmail\` VARCHAR(128)
          )
          ENGINE = InnoDB;`
          )
          .pipe(map(() => true)),
        this.db
          .execute(
            `CREATE TABLE IF NOT EXISTS \`${this.configs.appDatabase}\`.\`configuration\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`appEmailName\` VARCHAR(128),
            \`appEmailUser\` VARCHAR(128),
            \`appEmailPassword\` VARCHAR(128),
            \`appSMTPAddress\` VARCHAR(128),
            \`appSMTPPort\` INT,
            \`appSMTPSecure\` BOOL,
            \`appEmailFrom\` VARCHAR(128),
            \`appEmailSubject\` VARCHAR(128),
            \`appEmailText\` VARCHAR(8192),
            \`appEmailHtml\` VARCHAR(8192),
            \`appServerHost\` VARCHAR(128),
            \`appServerPort\` INT,
            \`appCronPattern\` VARCHAR(128),
            \`appCronTimezone\` VARCHAR(128),
            \`appNotificationTriggerDelta\` INT
          )
          ENGINE = InnoDB;`
          )
          .pipe(map(() => true))
      );
    } catch (e) {
      return new BehaviorSubject([false]);
    }
  }

  private createDb(): Observable<void> {
    return this.db.execute(
      `CREATE DATABASE IF NOT EXISTS ${this.configs.appDatabase}
          CHARACTER SET utf8
          COLLATE utf8_unicode_ci`
    );
  }

  private createUser(): Observable<void> {
    return this.db.execute(
      `CREATE USER IF NOT EXISTS '${this.configs.dbAppUser}' IDENTIFIED BY '${this.configs.dbAppPassword}'`
    );
  }

  private grantPermissions(): Observable<void> {
    return this.db.execute(
      `GRANT ALL ON ${this.configs.appDatabase}.* TO '${this.configs.dbAppUser}'`
    );
  }
}
