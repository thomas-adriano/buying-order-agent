import { Database } from "./database";
import * as mysql from "mysql";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

export class MigrateDb {
  public static init(cfg: mysql.ConnectionConfig): Observable<void> {
    console.log("executing migrations");
    const database = new Database(cfg);
    database.init();
    // timestamp,sent,customerEmail,employeeEmail
    return database
      .execute(
        `CREATE TABLE IF NOT EXISTS \`INSPIRE_HOME\`.\`order-notification\` (
            \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            \`timestamp\` DATETIME NOT NULL,
            \`sent\` BOOL NOT NULL,
            \`customerEmail\` VARCHAR(128) NOT NULL,
            \`employeeEmail\` VARCHAR(128) NOT NULL
          )
          ENGINE = InnoDB;`
      )
      .pipe(
        tap(() => {
          database.end();
        })
      );
  }
}
