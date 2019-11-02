import * as mysql from 'mysql';
import { BehaviorSubject, forkJoin, Observable, zip } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { IServerConfigs } from '../http/http-server';
import { Database } from './database';

export class MigrateDb {
  public static init(configs: IServerConfigs): Observable<any> {
    console.log(`migration: starting with configs`, configs);
    const cfg: mysql.ConnectionConfig = {
      host: configs.dbHost,
      password: configs.dbRootPassword,
      user: configs.dbRootUser
    };
    try {
      const database = new Database(cfg);
      database.init();
      return zip(
        MigrateDb.createDb(database, configs),
        MigrateDb.createUser(database, configs).pipe(
          tap(ran => {
            if (ran) {
              MigrateDb.grantPermissions(database, configs);
            }
          })
        ),
        MigrateDb.createTables(database, configs)
      ).pipe(
        map(() => {
          database.end();
          return true;
        }, catchError(err => new BehaviorSubject(false)))
      );
    } catch (e) {
      throw new Error('Verifique sua conexão com o mysql');
    }
  }

  private static createTables(
    database: Database,
    configs: IServerConfigs
  ): Observable<boolean[]> {
    try {
      return forkJoin(
        database
          .execute(
            `CREATE TABLE IF NOT EXISTS \`${configs.appDatabase}\`.\`order-notification\` (
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
        database
          .execute(
            `CREATE TABLE IF NOT EXISTS \`configuration\`.\`order-notification\` (
            \`dbHost\` VARCHAR(128),
            \`dbRootUser\` VARCHAR(128),
            \`dbRootPassword\` VARCHAR(128),
            \`dbAppUser\` VARCHAR(128),
            \`dbAppPassword\` VARCHAR(128),
            \`appDatabase\` VARCHAR(128),
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
          )
          ENGINE = InnoDB;`
          )
          .pipe(map(() => true))
      );
    } catch (e) {
      return new BehaviorSubject([false]);
    }
  }

  private static createDb(
    database: Database,
    configs: IServerConfigs
  ): Observable<boolean> {
    const stmt = `CREATE DATABASE IF NOT EXISTS ${configs.appDatabase}
    CHARACTER SET utf8
    COLLATE utf8_unicode_ci`;
    console.log(`migration: preparing to execute ${stmt}`);
    return database.execute(stmt).pipe(
      map(() => {
        console.log('migration: databse created');
        return true;
      }),
      catchError(err => {
        console.error('migration: error creating database');
        return new BehaviorSubject(false);
      })
    );
  }

  private static createUser(
    database: Database,
    configs: IServerConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `CREATE USER IF NOT EXISTS '${configs.dbAppUser}' IDENTIFIED BY '${configs.dbAppPassword}'`
        )
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }

  private static grantPermissions(
    database: Database,
    configs: IServerConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `GRANT ALL ON ${configs.appDatabase}.* TO '${configs.dbAppUser}'`
        )
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }
}
