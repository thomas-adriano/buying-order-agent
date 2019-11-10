import { CronJob } from 'cron';
import { Observable, Subject } from 'rxjs';
import { AppConfigs } from '../app-configs';

export class Cron {
  private cronJob: CronJob;
  private cronSubject = new Subject<void>();

  constructor(private configs: AppConfigs) {}

  public start(): Observable<void> {
    console.log(
      `cron: registering cron job ${this.configs.getAppCronPattern()}`
    );
    this.cronJob = new CronJob(
      this.configs.getAppCronPattern(),
      () => {
        console.log(
          `cron: running cron job ${this.configs.getAppCronPattern()}`
        );
        this.cronSubject.next();
      },
      undefined,
      true,
      this.configs.getAppCronTimezone()
    );
    console.log(`cron: starting cron job`);
    this.cronJob.start();
    return this.cronSubject.asObservable();
  }

  public stop(): void {
    if (this.cronJob) {
      console.log(`cron: stopping cron job`);
      this.cronJob.stop();
    }
  }

  public isRunning(): boolean {
    return !this.cronJob || !!this.cronJob.running;
  }
}
