import { cryptico, RSAKey } from "@daotl/cryptico";
import crypto from "crypto";
import { deriveAddressFromPublicKey } from "./addressService";
import { getContactByAlias } from "./contactService";

let _userAddress: string;
let _rsakey: RSAKey;
let _publicKeyString: string;

// Each node will have this 'shared' private key as well
// This is because the Cryptico module does not support signing only
// Therefore when only have to sign but not encrypt, this shared key will be used
const _sharedKey = "PrivyIsAwesome";
const _sharedUser = "PrivyUser";
let _sharedRsaKey: RSAKey;
let _sharedPublicKeyString: string;
const _keylen = 64;

export const generateIdentity = async (
  seed: string
) => {
  _rsakey = cryptico.generateRSAKey(seed, 1024);
  _publicKeyString = cryptico.publicKeyString(_rsakey);
  _userAddress = deriveAddressFromPublicKey(_publicKeyString)
  
  _generateSharedKeys()
};

const _generateSharedKeys = () => {
  const sharedSeed = crypto
    .scryptSync(_sharedKey, _sharedUser, _keylen)
    .toString("base64");
  _sharedRsaKey = cryptico.generateRSAKey(sharedSeed, 1024);
  _sharedPublicKeyString = cryptico.publicKeyString(_sharedRsaKey);
}

// this function should only ever be called on proxy nodes
export const generateProxyIdentity = (pubkey: string) => {
  _userAddress = deriveAddressFromPublicKey(pubkey)
  _publicKeyString = pubkey;
  _generateSharedKeys()
}

export const getUserAddress = () => _userAddress;

export const getRSAKey = () => _rsakey;

export const getPublicKeyString = () => _publicKeyString;

export const getSharedRSAKey = () => _sharedRsaKey;

export const getSharedPublicKeyString = () => _sharedPublicKeyString;
