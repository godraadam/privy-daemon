import { cryptico } from "@daotl/cryptico";
import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyError } from "../../model/errors";
import {
  CloneRequest,
  CloneRequestResponse,
  ProxyRequest,
  ProxyRequestResponse,
} from "../../model/requestModel";
import { getContactRepo, getMessageRepo } from "../../repo/connectionManager";
import {
  getContactByAddress,
  isAddressTrusted,
} from "../../service/contactService";
import {
  getPublicKeyString,
  getRSAKey,
  getSharedPublicKeyString,
} from "../../service/identityService";
import { publishToTopic } from "../../service/ipfsService";
import {
  encryptMessage,
  generateNonce,
  sha256,
  signMessage,
  verifySignature,
} from "../../util/crypto";

export const handleCloneRequest = async (msg: Message) => {
  const body = JSON.parse(msg.data.toString()) as CloneRequest;
  const verified = verifySignature(body.nonce, body.signature, body.pubkey);

  const sendResponse = async (repo: any) => {
    await repo.access.grant("write", body.writeKey);
    const address = repo.address.toString();
    const nonce = generateNonce();
    const response: CloneRequestResponse = {
      status: "accepted",
      pubkey: getPublicKeyString(),
      nonce: nonce,
      signature: signMessage(nonce),
      address: encryptMessage(address, body.pubkey),
    };
    publishToTopic(body.nonce, JSON.stringify(response));
  };

  //verify that user with given public key is trusted
  const trusted = isAddressTrusted(sha256(body.pubkey));
  if (verified && trusted) {
    switch (body.repo) {
      case "MESSAGES":
        sendResponse(getMessageRepo());
        break;
      case "CONTACTS":
        sendResponse(getContactRepo());
        break;
      default:
        return PrivyError.INVALID_REPO_NAME;
    }
  } else {
    return PrivyError.INVALID_SIGNATURE;
  }
};

export const handleProxyRequest = async (msg: Message) => {
  const body = JSON.parse(msg.data.toString()) as ProxyRequest;
  const address = sha256(body.pubkey);
  const contact = await getContactByAddress(address);
  if (!contact) {
    const nonce = generateNonce();
    const signature = signMessage(nonce);
    const response: ProxyRequestResponse = {
      status: "rejected",
      reason:"asd"
    };
  }
};
