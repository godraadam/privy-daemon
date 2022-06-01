import { Message } from "ipfs-core-types/src/pubsub";
import {
  CloneRequest,
  CloneRequestResponse,
  ProxyRequest,
  ProxyRequestResponse,
  ResponseRejected,
} from "../../model/requestModel";
import { getContactRepo, getIncomingMessageRepo } from "../../repo/connectionManager";
import { isPubKeyTrusted } from "../../service/contactService";
import {
  getPublicKeyString,
  getUserAddress,
  getUserName,
} from "../../service/identityService";
import { publishToTopic } from "../../service/ipfsService";
import {
  encryptMessage,
  generateNonce,
  signMessage,
  verifySignature,
} from "../../util/crypto";
import axios from "axios";
import { startProxyNode } from "../../service/proxyService";

const sendRejectResponse = async (channel: string, reason: string) => {
  const response: ResponseRejected = {
    status: "rejected",
    reason: reason,
  };
  publishToTopic(channel, JSON.stringify(response));
};

export const handleCloneRequest = async (msg: Message) => {
  const body = JSON.parse(msg.data.toString()) as CloneRequest;

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

  const verified = verifySignature(body.nonce, body.signature, body.pubkey);
  if (!verified) {
    sendRejectResponse(body.nonce, "Signature verification failed");
  }

  //verify that user with given public key is trusted
  const trusted = await isPubKeyTrusted(body.pubkey);
  if (!trusted) {
    sendRejectResponse(body.nonce, "Not trusted by receiver");
    return;
  }

  switch (body.repo) {
    case "MESSAGES":
      sendResponse(getIncomingMessageRepo());
      break;
    case "CONTACTS":
      sendResponse(getContactRepo());
      break;
    default:
      sendRejectResponse(body.nonce, "Invalid repo name");
  }
};

export const handleProxyRequest = async (msg: Message) => {
  const body = JSON.parse(msg.data.toString()) as ProxyRequest;
  const verified = verifySignature(body.nonce, body.signature, body.pubkey);
  if (!verified) {
    sendRejectResponse(body.nonce, "Signature verification failed");
    return;
  }
  const trusted = isPubKeyTrusted(body.pubkey);
  if (!trusted) {
    sendRejectResponse(body.nonce, "Not trusted by receiver");
    return;
  }

  // Proxy request accepted
  // Signal the manager to start a new proxy node
  await startProxyNode(body.pubkey);
  
  // Respond to request
  const nonce = generateNonce();
  const response: ProxyRequestResponse = {
    status: "accepted",
    pubkey: getPublicKeyString(),
    nonce: nonce,
    signature: signMessage(nonce),
  };
  publishToTopic(body.nonce, JSON.stringify(response));
};
