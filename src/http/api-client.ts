import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { BuyingOrder } from "../models/buying-order.model";
import { Provider } from "../models/provider.model";
import { HttpClient } from "./http-client";

export class ApiClient {
  constructor(private httpClient: HttpClient) {}

  public fetchBuyingOrders(): Observable<BuyingOrder[]> {
    const resource = `/api/ordens-de-compra?situacoes=0`;
    return this.httpClient.get(`${resource}`).pipe(
      map(
        (json: any[]) => {
          if (!Array.isArray(json)) {
            throwError(json);
          }
          return json.map(o => new BuyingOrder(o));
        },
        catchError(e => new BehaviorSubject(`Could not reach ${resource}`))
      )
    );
  }

  public fetchProviderById(id: string | undefined): Observable<Provider> {
    if (!id) {
      console.log("noid");
      return new BehaviorSubject({});
    }
    const resource = `/api/fornecedores/${id}`;
    return this.httpClient.get(`${resource}`).pipe(
      map((json: any) => {
        return new Provider(json[0]);
      })
    );
  }
}
