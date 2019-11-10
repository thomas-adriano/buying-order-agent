import * as WebSocket from 'ws';

export class WebsocketServer {
  private conectedClient: WebSocket;
  private lastStatus: string;
  private wss: WebSocket.Server;

  public init(): void {
    this.wss = new WebSocket.Server({ port: 8989 });
    this.wss.on('connection', ws => {
      console.log('websocket: connection received');
      if (this.conectedClient) {
        this.conectedClient.close();
      }
      this.conectedClient = ws as any;
      this.conectedClient.on('close', () => {
        console.log('websocket: connection closed');
      });
      this.sendBuffer();
    });
    this.wss.on('error', err => {
      console.log('websocket: error', err);
    });
  }

  public send(s: string): void {
    if (this.conectedClient) {
      this.sendBuffer();
      console.log('websocket: ', s);
      this.conectedClient.send(s);
    } else {
      this.lastStatus = s;
    }
  }

  public close(): void {
    this.wss.close();
  }

  private sendBuffer(): void {
    if (this.lastStatus) {
      this.conectedClient.send(this.lastStatus);
    }
  }
}
