import * as mysql from 'mysql';
import { Observable, zip, EMPTY, BehaviorSubject } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { AppConfigs } from '../app-configs';
import { Database } from './database';

export class MigrateDb {
  public static init(configs: AppConfigs): Observable<any> {
    const cfg: mysql.ConnectionConfig = {
      host: configs.getDbHost(),
      password: configs.getDbRootPassword(),
      user: configs.getDbRootUser()
    };
    try {
      console.log('executing migrations');
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
    configs: AppConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `CREATE TABLE IF NOT EXISTS \`${configs.getAppDatabase()}\`.\`order-notification\` (
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
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }

  private static createDb(
    database: Database,
    configs: AppConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `CREATE DATABASE IF NOT EXISTS ${configs.getAppDatabase()}
       CHARACTER SET utf8
       COLLATE utf8_unicode_ci`
        )
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }

  private static createUser(
    database: Database,
    configs: AppConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `CREATE USER IF NOT EXISTS '${configs.getDbAppUser()}' IDENTIFIED BY '${configs.getDbAppPassword()}'`
        )
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }

  private static grantPermissions(
    database: Database,
    configs: AppConfigs
  ): Observable<boolean> {
    try {
      return database
        .execute(
          `GRANT ALL ON ${configs.getDbAppUser()}.* TO '${configs.getDbAppPassword()}'`
        )
        .pipe(map(() => true));
    } catch (e) {
      return new BehaviorSubject(false);
    }
  }
}
