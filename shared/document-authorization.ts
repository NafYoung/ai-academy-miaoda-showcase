export interface DocumentComponentAuth {
  appId: string;
  openId?: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  url: string;
  jsApiList: string[];
}

export interface DocumentAuthorizationStart {
  authorizationUrl: string;
  state: string;
}

export interface DocumentAuthorizationResult {
  src: string;
  auth: DocumentComponentAuth;
}

export interface DocumentReaderStatus {
  enabled: boolean;
  mode: 'application' | 'user' | 'disabled';
}
