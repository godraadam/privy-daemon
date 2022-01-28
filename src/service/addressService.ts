import {
  cloneContactRepo,
  cloneMessageRepo,
  getContactRepo,
  getMessageRepo,
  getWriteKey,
  verifyAddress,
} from "../repo/connectionManager";
import { getPublicKeyString, getUserAddress } from "../service/identityService";
import { publishToTopic, subscribeToTopic } from "../service/ipfsService";
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

export const fetchMessageRepoAddrAndClone = async (
  callback: (err?: PrivyError) => void
) => {
  await fetchRepoAndClone("MESSAGES", callback, cloneMessageRepo);
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
    if (body.status === "accepted") {
      const response = body as CloneRequestResponseSuccess;
      const verified = verifySignature(
        response.nonce,
        response.signature,
        response.pubkey
      );

      if (!verified) {
        callback(PrivyError.INVALID_SIGNATURE);
      }
      if (verified) {
        const address = decryptMessage(response.address);
        if (address && verifyAddress(address)) {
          await cloneRepo(address);
          callback();
        } else {
          callback(PrivyError.INVALID_ADDRESS);
        }
      }
    } else {
      callback(PrivyError.REQUEST_REJECTED);
    }
  };

  subscribeToTopic(nonce, handleResponse);

  const signature = signMessage(nonce);
  if (signature) {
    const request: CloneRequest = {
      repo: repo,
      pubkey: getPublicKeyString(),
      nonce: nonce,
      signature: signature,
      writeKey: getWriteKey(),
    };
    await publishToTopic(
      getUserAddress() + "/request/clone",
      JSON.stringify(request)
    );
  }
};

export const getMessageRepoAddress = () => getMessageRepo().address.toString();
export const getContactRepoAddress = () => getContactRepo().address.toString();

export const deriveAddressFromPublicKey = (pubkey: string): string => {
  return `/privy/${sha256(pubkey)}`
}
