import { cryptico, RSAKey } from "@daotl/cryptico";
import crypto from "crypto";
import { generateNonce } from "../util/crypto";
import { deriveAddressFromPublicKey } from "./addressService";

let _userAddress: string;
let _rsakey: RSAKey;
let _publicKeyString: string;
let _username: string;
let _nodetype: string;

// needed only by proxy nodes
let _token: string;

// Each node will have this 'shared' private key as well
// This is because the Cryptico module does not support signing only
// Therefore when only have to sign but not encrypt, this shared key will be used
const _sharedKey = "PrivyIsAwesome";
const _sharedUser = "PrivyUser";
let _sharedRsaKey: RSAKey;
let _sharedPublicKeyString: string;
const _keylen = 64;

export const generateIdentity = async (
  seed: string,
  username: string,
  nodetype: string
) => {
  _rsakey = cryptico.generateRSAKey(seed, 1024);
  _publicKeyString = cryptico.publicKeyString(_rsakey);
  _userAddress = deriveAddressFromPublicKey(_publicKeyString)
  _username = username;
  _generateSharedKeys();
  _nodetype = nodetype;
  console.info(`Derived public key: ${getPublicKeyString()}`);
  console.info(`Derived user address: ${getUserAddress()}`);
};

const _generateSharedKeys = () => {
  const sharedSeed = crypto
    .scryptSync(_sharedKey, _sharedUser, _keylen)
    .toString("base64");
  _sharedRsaKey = cryptico.generateRSAKey(sharedSeed, 1024);
  _sharedPublicKeyString = cryptico.publicKeyString(_sharedRsaKey);
}

// this function should only ever be called on proxy nodes
export const generateProxyIdentity = (pubkey: string, token: string) => {
  _userAddress = deriveAddressFromPublicKey(pubkey)
  _publicKeyString = pubkey;
  _token = token;
  _nodetype = 'proxy';
  _generateSharedKeys();
  
  // keys for encryption, not of the proxied user's
  _rsakey = cryptico.generateRSAKey(generateNonce(), 1024);
  _publicKeyString = cryptico.publicKeyString(_rsakey);
  console.info(`From proxied public key: ${getPublicKeyString()}`);
  console.info(`Derived proxied user address: ${getUserAddress()}`);
}

export const getUserAddress = () => _userAddress;

export const getRSAKey = () => _rsakey;

export const getPublicKeyString = () => _publicKeyString;

export const getSharedRSAKey = () => _sharedRsaKey;

export const getSharedPublicKeyString = () => _sharedPublicKeyString;

export const getUserName = () => _username

export const getToken = () => _token;

export const getNodeType = () => _nodetype;