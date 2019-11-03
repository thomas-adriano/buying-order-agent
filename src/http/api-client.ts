import { BuyingOrder } from '../models/buying-order.model';
import { HttpClient } from './http-client';
import { Observable, throwError, EMPTY, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Provider } from '../models/provider.model';

export class ApiClient {
  constructor(private httpClient: HttpClient) {}

  public fetchBuyingOrders(): Observable<BuyingOrder[]> {
    const resource = `/api/ordens-de-compra`;
    return this.httpClient.get(`${resource}`).pipe(
      map((json: any[]) => {
        if (!Array.isArray(json)) {
          throwError(json);
        }
        return json.map(o => new BuyingOrder(o));
      }, catchError(e => new BehaviorSubject(`Could not reach ${resource}`)))
    );
  }

  public fetchProviderById(id: string | undefined): Observable<Provider> {
    if (!id) {
      return EMPTY;
    }
    const resource = `/api/fornecedores/${id}`;
    return this.httpClient.get(`${resource}`).pipe(
      map((json: any) => {
        return new Provider(json[0]);
      }, catchError(e => new BehaviorSubject(`Could not reach ${resource}`)))
    );
  }
}
