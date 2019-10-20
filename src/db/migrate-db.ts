import * as mysql from "mysql";
import { Observable, zip } from "rxjs";
import { tap } from "rxjs/operators";
import { Database } from "./database";

export class MigrateDb {
  public static init(cfg: mysql.ConnectionConfig): Observable<any> {
    console.log("executing migrations");
    const database = new Database(cfg);
    database.init();
    return zip(
      MigrateDb.createDb(database),
      MigrateDb.createUser(database),
      MigrateDb.grantPermissions(database),
      MigrateDb.createTables(database)
    ).pipe(
      tap(() => {
        database.end();
      })
    );
  }

  private static createTables(database: Database): Observable<void> {
    return database.execute(
      `CREATE TABLE IF NOT EXISTS \`INSPIRE_HOME\`.\`order-notification\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`timestamp\` DATETIME NOT NULL,
            \`sent\` BOOL NOT NULL,
            \`orderDate\` DATE NOT NULL,
            \`estimatedOrderDate\` DATE NOT NULL,
            \`customerEmail\` VARCHAR(128) NOT NULL,
            \`employeeEmail\` VARCHAR(128) NOT NULL
          )
          ENGINE = InnoDB;`
    );
  }

  private static createDb(database: Database): Observable<void> {
    return database.execute(
      `CREATE DATABASE IF NOT EXISTS INSPIRE_HOME
       CHARACTER SET utf8
       COLLATE utf8_unicode_ci`
    );
  }

  private static createUser(database: Database): Observable<void> {
    return database.execute(
      `CREATE USER 'buyingorderagent' IDENTIFIED BY '123'`
    );
  }

  private static grantPermissions(database: Database): Observable<void> {
    return database.execute(
      `GRANT ALL ON INSPIRE_HOME.* TO 'buyingorderagent'`
    );
  }
}
