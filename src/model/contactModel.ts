export interface PrivyContact {
  alias: string;
  pubkey: string;
  address: string;
  trusted: boolean;
  proxy: boolean;
  hash?: string;
}

export interface PrivyContactCreate {
  alias: string;
  pubkey: string;
  trusted?: boolean;
}

export interface PrivyContactUpdate {
  alias: string;
  trusted: boolean;
}
