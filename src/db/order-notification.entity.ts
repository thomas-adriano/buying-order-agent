export interface IOrderNotification {
  id: number;
  timestamp: Date;
  sent: boolean;
  providerEmail: string;
  employeeEmail: string;
}
