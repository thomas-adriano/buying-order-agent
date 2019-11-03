import { WebsocketServer } from './websocket-server';
import { Statuses } from './statuses';

export class AppStatusHandler {
  constructor(private wss: WebsocketServer) {}

  public init(): void {
    this.wss.init();
  }

  public changeStatus(s: Statuses): void {
    console.log('app-status-handler: changeStatus', s);
    this.wss.send(s);
  }
}
