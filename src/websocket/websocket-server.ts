import * as WebSocket from 'ws';

export class WebsocketServer {
  private conectedClient: WebSocket;
  private buffer: string[] = [];

  public init(): void {
    const wss = new WebSocket.Server({ port: 8989 });
    wss.on('connection', ws => {
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
    wss.on('error', err => {
      console.log('websocket: error', err);
    });
  }

  public send(s: string): void {
    if (this.conectedClient) {
      this.sendBuffer();
      console.log('websocket: ', s);
      this.conectedClient.send(s);
    } else {
      this.buffer.push(s);
    }
  }

  private sendBuffer(): void {
    if (this.buffer.length) {
      this.buffer.forEach(m => this.conectedClient.send(m));
    }
  }
}
