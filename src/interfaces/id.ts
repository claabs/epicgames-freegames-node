export interface IdRedirectResponseBad {
  errorCode: string;
  message: string;
  metadata: Metadata;
  correlationId: string;
}

export interface Metadata {
  correctiveAction: string;
  continuation: string;
}

export interface IdRedirectReponseGood {
  redirectUrl: string;
  authorizationCode: null;
  exchangeCode: null;
  sid: string;
  ssoV2Enabled: boolean;
}
