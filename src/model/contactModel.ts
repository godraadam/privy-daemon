export interface PrivyContact {
  alias: string;
  pubkey: string;
  address: string;
  trusted: boolean;
  hash?: string;
}

export interface PrivyContactCreate {
    alias: string;
    pubkey: string;
    trusted?: boolean;
}
