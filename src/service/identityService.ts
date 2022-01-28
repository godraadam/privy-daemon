import { cryptico, RSAKey } from "@daotl/cryptico";
import crypto from "crypto";
import { deriveAddressFromPublicKey } from "./addressService";
import { getContactByAlias } from "./contactService";

let _userAddress: string;
let _username: string;
let _rsakey: RSAKey;
let _publicKeyString: string;

// Each node will have this 'shared' private key as well
// This is because the Cryptico module does not support signing only
// Therefore when only have to sign but not encrypt, this shared key will be used
const _sharedKey = "PrivyIsAwesome";
const _sharedUser = "PrivyUser";
let _sharedRsaKey: RSAKey;
let _sharedPublicKeyString: string;

export const generateIdentity = async (
  passphrase: string,
  username: string
) => {
  const keylen = 64;
  const seed = crypto
    .scryptSync(passphrase, username, keylen)
    .toString("base64");
  _username = username;
  _rsakey = cryptico.generateRSAKey(seed, 1024);
  _publicKeyString = cryptico.publicKeyString(_rsakey);
  _userAddress = deriveAddressFromPublicKey(_publicKeyString)

  const sharedSeed = crypto
    .scryptSync(_sharedKey, _sharedUser, keylen)
    .toString("base64");
  _sharedRsaKey = cryptico.generateRSAKey(sharedSeed, 1024);
  _sharedPublicKeyString = cryptico.publicKeyString(_sharedRsaKey);
};

export const getUserAddress = () => _userAddress;

export const getRSAKey = () => _rsakey;

export const getPublicKeyString = () => _publicKeyString;

export const getSharedRSAKey = () => _sharedRsaKey;

export const getSharedPublicKeyString = () => _sharedPublicKeyString;

export const getUsername = () => _username

export const getSelf = async () => {
  return await getContactByAlias(_username);
};
