import { BuyingOrder } from "../models/buying-order.model";
import { HttpClient } from "./http-client";
import { Observable, throwError } from "rxjs";
import { map } from "rxjs/operators";
import { Provider } from "../models/provider.model";

export class ApiClient {
  constructor(private httpClient: HttpClient) {}

  public fetchBuyingOrders(): Observable<BuyingOrder[]> {
    return this.httpClient.get("/api/ordens-de-compra").pipe(
      map((json: any[]) => {
        if (!Array.isArray(json)) {
          throwError(json);
        }
        return json.map(o => new BuyingOrder(o));
      })
    );
  }

  public fetchProviderById(id: string | undefined): Observable<Provider> {
    return this.httpClient.get(`/api/fornecedores/${id}`).pipe(
      map((json: any) => {
        return new Provider(json[0]);
      })
    );
  }
}
