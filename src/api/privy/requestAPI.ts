import { Message } from "ipfs-core-types/src/pubsub";
import {
  CloneRequest,
  CloneRequestResponse,
  ProxyRequest,
  ProxyRequestResponse,
  ResponseRejected,
} from "../../model/requestModel";
import {
  getContactRepo,
  getIncomingMessageRepo,
  getOutgoingMessageRepo,
} from "../../repo/connectionManager";
import { isPubKeyTrusted } from "../../service/contactService";
import {
  getPublicKeyString,
} from "../../service/identityService";
import { publishToTopic } from "../../service/ipfsService";
import {
  encryptMessage,
  generateNonce,
  signMessage,
  verifySignature,
} from "../../util/crypto";
import { startProxyNode } from "../../service/proxyService";
import { getContactRepoAddress, getIncomingMessageRepoAddress, getOutgoingMessageRepoAddress } from "../../service/addressService";

const sendRejectResponse = async (channel: string, reason: string) => {
  const response: ResponseRejected = {
    status: "rejected",
    reason: reason,
  };
  publishToTopic(channel, JSON.stringify(response));
};

export const handleCloneRequest = async (msg: Message) => {
  const body = JSON.parse(msg.data.toString()) as CloneRequest;
  console.info(`Received clone request from ${body.pubkey}`);

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
    await publishToTopic(body.nonce, JSON.stringify(response));
    console.info("Reponse sent!")
  };

  const verified = verifySignature(body.nonce, body.signature, body.pubkey);
  if (!verified) {
    await sendRejectResponse(body.nonce, "Signature verification failed");
  }

  //verify that user with given public key is trusted
  const trusted = await isPubKeyTrusted(body.pubkey);
  if (!trusted) {
    await sendRejectResponse(body.nonce, "Not trusted by receiver");
    return;
  }

  switch (body.repo) {
    case "INCOMING_MESSAGES":
      console.info(`Sending incoming message repository address ${getIncomingMessageRepoAddress()} for cloning...`)
      await sendResponse(getIncomingMessageRepo());
      break;
    case "OUTGOING_MESSAGES":
      console.info(`Sending outgoing message repository address ${getOutgoingMessageRepoAddress()} for cloning...`)
      
      await sendResponse(getOutgoingMessageRepo());
      break;
    case "CONTACTS":
      console.info(`Sending contact repository address ${getContactRepoAddress()} for cloning`)
      
      await sendResponse(getContactRepo());
      break;
    default:
      await sendRejectResponse(body.nonce, "Invalid repo name");
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
  await publishToTopic(body.nonce, JSON.stringify(response));
};
