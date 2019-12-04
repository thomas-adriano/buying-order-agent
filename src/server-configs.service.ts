import * as fs from "fs";
import * as path from "path";

export interface IServerConfigsModel {
  testRecipientMail: string;
  appHost: string;
  appPort: number;
  dbAppUser: string;
  dbRootUser: string;
  dbRootPassword: string;
  dbHost: string;
  dbPort: number;
  appDatabase: string;
  dbAppPassword: string;
  apiUrl: string;
  apiJwt: string;
}

export class ServerConfigsService {
  public static getInstance(): ServerConfigsService {
    if (!this.instance) {
      this.instance = new ServerConfigsService();
    }
    return this.instance;
  }

  private static instance: ServerConfigsService;
  // tslint:disable-next-line: variable-name
  private _configs: IServerConfigsModel;

  public get configs(): IServerConfigsModel {
    return this._configs;
  }

  private constructor() {
    this._configs = this.loadServerConfigs();
  }

  private loadServerConfigs(): IServerConfigsModel {
    const p = `${__dirname}${path.sep}server.json`;
    console.log(`app: reading serverConfigs from ${p}`);
    const fc = fs.readFileSync(p, "utf8");
    console.log(`app: serverConfigs file loaded ${fc}`);
    const c = JSON.parse(fc) as IServerConfigsModel;
    return c;
  }
}
