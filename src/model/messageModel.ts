export interface PrivyMessage {
  from: string; // public key of sender, encrypted
  to: string // public key of recipient
  content: string; // content of message, encrypted
  timestamp: string; // ISO date-time string, encrypted
  nonce: string;
  signature: string;
  hash?: string;
}

export interface PrivyMessageInRepo {
  from: string; // public key of sender, encrypted
  to: string // public key of recipient
  content: string; // content of message, encrypted
  timestamp: string; // ISO date-time string, encrypted
  nonce: string;
  signature: string;
  hash?: string;
  delivered: "delivered" | "failed" | "undetermined";
  seen: boolean;
}

export interface PrivyMessageUpdate {
  delivered?: "delivered" | "failed" | "undetermined";
  seen? : boolean;
}

export interface PrivyMessageReceipt {
  status: "delivered";
  pubkey: string;
  nonce: string;
  signature: string;
  timestamp: string;
}