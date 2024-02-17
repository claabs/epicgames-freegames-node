export enum NotificationReason {
  LOGIN = 'LOGIN',
  PURCHASE = 'PURCHASE',
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
  TEST = 'TEST',
  PURCHASE_ERROR = 'PURCHASE ERROR',
}

export interface NotificationFields {
  account: string;
  reason: NotificationReason;
  url?: string;
  /**
   * Localtunnel password
   */
  password?: string;
}
