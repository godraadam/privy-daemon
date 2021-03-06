export interface CloneRequest {
  repo: string;
  pubkey: string;
  nonce: string;
  signature?: string;
  writeKey: string;
  token?: string;
}

export interface CloneRequestResponseSuccess {
  status: "accepted";
  pubkey: string;
  address: string; // encrypted with requester's publickey
  nonce: string;
  signature: string;
}

export interface ResponseRejected {
  status: "rejected";
  reason: string;
}

export interface ProxyRequest {
  pubkey: string;
  nonce: string;
  signature: string;
}

export interface ProxyRequestResponseSuccess {
  status: "accepted";
  pubkey: string;
  nonce: string;
  signature: string;
  token: string;
}

export type CloneRequestResponse =
  | CloneRequestResponseSuccess
  | ResponseRejected;
export type ProxyRequestResponse =
  | ProxyRequestResponseSuccess
  | ResponseRejected;
