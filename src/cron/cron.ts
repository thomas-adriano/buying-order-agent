import { CronJob } from 'cron';
import { Observable, Subject } from 'rxjs';
import { AppConfigs } from '../app-configs';

export class Cron {
  private cronJob: CronJob;
  private cronSubject = new Subject<void>();

  constructor(private configs: AppConfigs) {}

  public start(): Observable<void> {
    this.cronJob = new CronJob(
      this.configs.getAppCronPattern(),
      () => {
        console.log('cron: running cron job');
        this.cronSubject.next();
      },
      undefined,
      true,
      this.configs.getAppCronTimezone()
    );
    this.cronJob.start();
    return this.cronSubject.asObservable();
  }

  public stop(): void {
    this.cronJob.stop();
  }
}
