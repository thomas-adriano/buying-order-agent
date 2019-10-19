export class BuyingOrder {
  public readonly id?: number;
  public readonly numeroPedido?: number;
  public readonly data?: string;
  public readonly dataPrevista?: string;
  public readonly idContato?: string;
  public readonly nomeContato?: string;

  constructor(partial?: Partial<BuyingOrder>) {
    Object.assign(this, partial);
  }
}
