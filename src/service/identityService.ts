import { cryptico, RSAKey } from "@daotl/cryptico";
import crypto from "crypto";
import { sha256 } from "../util/crypto";
import { getContactByAlias } from "./contactService";

let userAddress: string;
let _username: string;
let rsakey: RSAKey;
let publicKeyString: string;

// Each node will have this 'shared' private key as well
// This is because the Cryptico does not support signing only
// Therefore when only have to sign but not encrypt, this shared key will be used
const sharedKey = "PrivyIsAwesome";
const sharedUser = "user";
let sharedRsaKey: RSAKey;
let sharedPublicKeyString: string;

export const generateIdentity = async (
  passphrase: string,
  username: string
) => {
  const keylen = 64;
  const seed = crypto
    .scryptSync(passphrase, username, keylen)
    .toString("base64");
  _username = username;
  rsakey = cryptico.generateRSAKey(seed, 1024);
  publicKeyString = cryptico.publicKeyString(rsakey);
  userAddress = "privy/" + sha256(publicKeyString);

  const sharedSeed = crypto
    .scryptSync(sharedKey, sharedUser, keylen)
    .toString("base64");
  sharedRsaKey = cryptico.generateRSAKey(sharedSeed, 1024);
  sharedPublicKeyString = cryptico.publicKeyString(sharedRsaKey);
};

export const getUserAddress = () => userAddress;

export const getRSAKey = () => rsakey;

export const getPublicKeyString = () => publicKeyString;

export const getSharedRSAKey = () => sharedRsaKey;

export const getSharedPublicKeyString = () => sharedPublicKeyString;

export const getSelf = async () => {
  return await getContactByAlias(_username);
};
