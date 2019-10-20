export class AppConfigs {
  // db
  private dbHost: string;
  private dbRootUser: string;
  private dbRootPassword: string;
  private dbAppUser: string;
  private appDbPassword: string;
  private appDatabase: string;
  // email
  private appEmailName: string;
  private appEmailUser: string;
  private appEmailPassword: string;
  private appSMTPAddress: string;
  private appSMTPPort: number;
  private appSMTPSecure: boolean;
  private appEmailEmployee: string;
  private appEmailFrom: string;
  private appEmailSubject: string;
  private appEmailText: string;
  private appEmailHtml: string;
  private appServerHost: string;
  private appServerPort: number;
  // cron
  private appCronPattern = "0,5,10,15,20,25,30,35,40,45,50,55 * * * * *";
  private appCronTimezone = "America/Sao_Paulo";

  public getAppServerHost(): string {
    return this.appServerHost;
  }

  public setAppServerHost(appServerHost: string): AppConfigs {
    this.appServerHost = appServerHost;
    return this;
  }

  public getAppServerPort(): number {
    return this.appServerPort;
  }

  public setAppServerPort(appServerPort: number): AppConfigs {
    this.appServerPort = appServerPort;
    return this;
  }

  public getDbHost(): string {
    return this.dbHost;
  }

  public setDbHost(dbHost: string): AppConfigs {
    this.dbHost = dbHost;
    return this;
  }

  public getDbRootUser(): string {
    return this.dbRootUser;
  }

  public setDbRootUser(dbRootUser: string): AppConfigs {
    this.dbRootUser = dbRootUser;
    return this;
  }

  public getDbRootPassword(): string {
    return this.dbRootPassword;
  }

  public setDbRootPassword(dbRootPassword: string): AppConfigs {
    this.dbRootPassword = dbRootPassword;
    return this;
  }

  public getDbAppUser(): string {
    return this.dbAppUser;
  }

  public setDbAppUser(dbAppUser: string): AppConfigs {
    this.dbAppUser = dbAppUser;
    return this;
  }

  public getAppDbPassword(): string {
    return this.appDbPassword;
  }

  public setAppDbPassword(appDbPassword: string): AppConfigs {
    this.appDbPassword = appDbPassword;
    return this;
  }

  public getAppDatabase(): string {
    return this.appDatabase;
  }

  public setAppDatabase(appDatabase: string): AppConfigs {
    this.appDatabase = appDatabase;
    return this;
  }

  public getAppEmailName(): string {
    return this.appEmailName;
  }

  public setAppEmailName(appEmailName: string): AppConfigs {
    this.appEmailName = appEmailName;
    return this;
  }

  public getAppEmailUser(): string {
    return this.appEmailUser;
  }

  public setAppEmailUser(appEmailUser: string): AppConfigs {
    this.appEmailUser = appEmailUser;
    return this;
  }

  public getAppEmailPassword(): string {
    return this.appEmailPassword;
  }

  public setAppEmailPassword(appEmailPassword: string): AppConfigs {
    this.appEmailPassword = appEmailPassword;
    return this;
  }

  public getAppSMTPAddress(): string {
    return this.appSMTPAddress;
  }

  public setAppSMTPAddress(appSMTPAddress: string): AppConfigs {
    this.appSMTPAddress = appSMTPAddress;
    return this;
  }

  public getAppSMTPPort(): number {
    return this.appSMTPPort;
  }

  public setAppSMTPPort(appSMTPPort: number): AppConfigs {
    this.appSMTPPort = appSMTPPort;
    return this;
  }

  public getAppSMTPSecure(): boolean {
    return this.appSMTPSecure;
  }

  public setAppSMTPSecure(appSMTPSecure: boolean): AppConfigs {
    this.appSMTPSecure = appSMTPSecure;
    return this;
  }

  public getAppEmailEmployee(): string {
    return this.appEmailEmployee;
  }

  public setAppEmailEmployee(appEmailEmployee: string): AppConfigs {
    this.appEmailEmployee = appEmailEmployee;
    return this;
  }
  public getAppEmailFrom(): string {
    return this.appEmailFrom;
  }

  public setAppEmailFrom(appEmailFrom: string): AppConfigs {
    this.appEmailFrom = appEmailFrom;
    return this;
  }

  public getAppEmailSubject(): string {
    return this.appEmailSubject;
  }

  public setAppEmailSubject(appEmailSubject: string): AppConfigs {
    this.appEmailSubject = appEmailSubject;
    return this;
  }

  public getAppEmailText(): string {
    return this.appEmailText;
  }

  public setAppEmailText(appEmailText: string): AppConfigs {
    this.appEmailText = appEmailText;
    return this;
  }

  public getAppEmailHtml(): string {
    return this.appEmailHtml;
  }

  public setAppEmailHtml(appEmailHtml: string): AppConfigs {
    this.appEmailHtml = appEmailHtml;
    return this;
  }

  public getAppCronPattern(): string {
    return this.appCronPattern;
  }

  public setAppCronPattern(appCronPattern: string): AppConfigs {
    this.appCronPattern = appCronPattern;
    return this;
  }

  public getAppCronTimezone(): string {
    return this.appCronTimezone;
  }

  public setAppCronTimezone(appCronTimezone: string): AppConfigs {
    this.appCronTimezone = appCronTimezone;
    return this;
  }
}
