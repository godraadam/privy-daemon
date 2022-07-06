import {
  cloneContactRepo,
  cloneIncomingMessageRepo,
  cloneOutgoingMessageRepo,
  getContactRepo,
  getIncomingMessageRepo,
  getOutgoingMessageRepo,
  getWriteKey,
  verifyAddress,
} from "../repo/connectionManager";
import { getNodeType, getPublicKeyString, getToken, getUserAddress } from "./identityService";
import { publishToTopic, subscribeToTopic } from "./ipfsService";
import { Message } from "ipfs-core-types/src/pubsub";
import {
  CloneRequest,
  CloneRequestResponse,
  CloneRequestResponseSuccess,
} from "../model/requestModel";
import {
  decryptMessage,
  generateNonce,
  sha256,
  signMessage,
  verifySignature,
} from "../util/crypto";
import { PrivyError } from "../model/errors";
import { cryptico } from "@daotl/cryptico";

export const fetchIncomingMessageRepoAddrAndClone = async (
  callback: (err?: PrivyError) => void
) => {
  await fetchRepoAndClone("INCOMING_MESSAGES", callback, cloneIncomingMessageRepo);
};

export const fetchOutgoingMessageRepoAddrAndClone = async (
  callback: (err?: PrivyError) => void
) => {
  await fetchRepoAndClone("OUTGOING_MESSAGES", callback, cloneOutgoingMessageRepo);
};


export const fetchContactRepoAddrAndClone = async (
  callback: (err?: PrivyError) => void
) => {
  await fetchRepoAndClone("CONTACTS", callback, cloneContactRepo);
};

const fetchRepoAndClone = async (
  repo: string,
  callback: (err?: PrivyError) => void,
  cloneRepo: (addr: string) => Promise<void>
) => {
  const nonce = generateNonce();

  const handleResponse = async (msg: Message) => {
    
    const body = JSON.parse(msg.data.toString()) as CloneRequestResponse;
    console.info(`Clone request response received...${JSON.stringify(body)}`)
    if (body.status === "accepted") {
      const response = body as CloneRequestResponseSuccess;
      const verified = verifySignature(
        response.nonce,
        response.signature,
        response.pubkey
      );

      if (!verified) {
        callback(PrivyError.INVALID_SIGNATURE);
        console.error("Response signature verification failed!")
      }
      if (verified) {
        const address = decryptMessage(response.address);
        if (address && verifyAddress(address)) {
          await cloneRepo(address);
          callback();
        } else {
          callback(PrivyError.INVALID_ADDRESS);
          console.error("Invalid repository addresss received!")
        }
      }
    } else {
      callback(PrivyError.REQUEST_REJECTED);
      console.error("The request has been rejected!")
    }
  };

  await subscribeToTopic(nonce, handleResponse);
  
  // proxy nodes use token instead of signature and a random key for encryption
  if (getNodeType() === 'proxy') {
    const request: CloneRequest = {
      repo: repo,
      pubkey: getPublicKeyString(),
      nonce: nonce,
      token: getToken(),
      writeKey: getWriteKey(),
    };
    console.info(`Publishing clone request to ${getUserAddress() + "/request/clone"}`)
    await publishToTopic(
      getUserAddress() + "/request/clone",
      JSON.stringify(request)
    );
    return;
  }

  const signature = signMessage(nonce);
  if (signature) {
    const request: CloneRequest = {
      repo: repo,
      pubkey: getPublicKeyString(),
      nonce: nonce,
      signature: signature,
      writeKey: getWriteKey(),
    };
    console.info(`Publishing clone request to ${getUserAddress() + "/request/clone"}`)
    await publishToTopic(
      getUserAddress() + "/request/clone",
      JSON.stringify(request)
    );
  }
};

export const getIncomingMessageRepoAddress = () => getIncomingMessageRepo().address.toString();
export const getOutgoingMessageRepoAddress = () => getOutgoingMessageRepo().address.toString();
export const getContactRepoAddress = () => getContactRepo().address.toString();

export const deriveAddressFromPublicKey = (pubkey: string): string => {
  return `/privy/${sha256(pubkey)}`
}
