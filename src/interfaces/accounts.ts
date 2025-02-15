export interface AccountResponse<T> {
  success: boolean;
  message: string;
  data: T[];
}

export interface EulaEntry {
  key: string;
  title: string;
  locale: string;
  version: number;
  revision: number;
  accountId: string;
  identityId: string;
  accepted: boolean;
  responseTimestamp: Date;
  url: string;
  description?: string;
}

export type EulaResponse = AccountResponse<EulaEntry>;
