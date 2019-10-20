export interface IOrderNotification {
  id: number;
  timestamp: Date;
  sent: boolean;
  customerEmail: string;
  employeeEmail: string;
}
