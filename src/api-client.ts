import { BuyingOrder } from "./buying-order.model";
import * as https from "https";

export class ApiClient {
  constructor(private jwtKey: string) {}

  public async fetchBuyingOrders(): Promise<BuyingOrder[]> {
    return await new Promise((resolve, reject) => {
      console.log("Fetching orders");
      https
        .get(
          {
            hostname: "inspirehome.eccosys.com.br",
            path: "/api/ordens-de-compra",
            headers: {
              Authorization: `Bearer ${this.jwtKey}`,
              Accept: "application/json",
              "Content-Type": "application/json"
            }
          },
          resp => {
            let body = "";
            resp.on("data", chunk => {
              body += chunk;
            });
            resp.on("end", () => {
              const json = JSON.parse(body) as any[];
              const orders = json.map(j => new BuyingOrder(j));
              return resolve(orders);
            });
          }
        )
        .on("error", e => {
          reject(e);
        });
    });
  }
}
