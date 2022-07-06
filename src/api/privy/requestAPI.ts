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
import {
  getContactByPublicKey,
  isPubKeyTrusted,
} from "../../service/contactService";
import { getPublicKeyString } from "../../service/identityService";
import { publishToTopic, subscribeToTopic } from "../../service/ipfsService";
import {
  encryptMessage,
  generateNonce,
  signMessage,
  verifySignature,
} from "../../util/crypto";
import { startProxyNode } from "../../service/proxyService";
import {
  getContactRepoAddress,
  getIncomingMessageRepoAddress,
  getOutgoingMessageRepoAddress,
} from "../../service/addressService";
import { saveContact } from "../../repo/contactRepo";
import { PrivyError } from "../../model/errors";

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
    console.info("Reponse sent!");
  };

  // if request coming from a proxy
  if (body.token) {
    const [msg, signature] = body.token.split("|");
    const verified = verifySignature(msg, signature, getPublicKeyString());
    if (!verified) {
      await sendRejectResponse(body.nonce, "Token verification failed");
    }
    switch (body.repo) {
      case "INCOMING_MESSAGES":
        console.info(
          `Sending incoming message repository address ${getIncomingMessageRepoAddress()} for cloning...`
        );
        await sendResponse(getIncomingMessageRepo());
        break;
      case "OUTGOING_MESSAGES":
        console.info(
          `Sending outgoing message repository address ${getOutgoingMessageRepoAddress()} for cloning...`
        );

        await sendResponse(getOutgoingMessageRepo());
        break;
      case "CONTACTS":
        console.info(
          `Sending contact repository address ${getContactRepoAddress()} for cloning`
        );

        await sendResponse(getContactRepo());
        break;
      default:
        await sendRejectResponse(body.nonce, "Invalid repo name");
    }
    return;
  }

  // if request coming from user instead of proxy
  if (body.signature) {
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
        console.info(
          `Sending incoming message repository address ${getIncomingMessageRepoAddress()} for cloning...`
        );
        await sendResponse(getIncomingMessageRepo());
        break;
      case "OUTGOING_MESSAGES":
        console.info(
          `Sending outgoing message repository address ${getOutgoingMessageRepoAddress()} for cloning...`
        );

        await sendResponse(getOutgoingMessageRepo());
        break;
      case "CONTACTS":
        console.info(
          `Sending contact repository address ${getContactRepoAddress()} for cloning`
        );

        await sendResponse(getContactRepo());
        break;
      default:
        await sendRejectResponse(body.nonce, "Invalid repo name");
    }
  }
};

export const handleProxyRequest = async (msg: Message) => {
  
  const _handleReresponse = async (msg: Message) => {
    const reresponse = JSON.parse(msg.data.toString()) as ProxyRequestResponse;
    console.info(`Received reresponse to proxy request response: ${JSON.stringify(reresponse)}`);
    if (reresponse.status === "accepted") {
      const verified = verifySignature(
        reresponse.nonce,
        reresponse.signature,
        reresponse.pubkey
      );

      if (!verified) {
        console.info('Signature verification failed!')
        return;
      }
      const contact = await getContactByPublicKey(reresponse.pubkey);
      if (!contact) {
        console.info('Contact not found!')
        return;
      }
      if (!contact.trusted) {
        console.info('Contact not trusted!')
        return;
      }
      // contact.proxy = true;
      // await saveContact(contact);
      await startProxyNode(reresponse.token, reresponse.pubkey);
      
      // respond with token
    } else {
      console.info('Request has been rejected!')
    }
  };
  
  const body = JSON.parse(msg.data.toString()) as ProxyRequest;
  console.info(`Received proxy request from ${body.pubkey}`);
  const verified = verifySignature(body.nonce, body.signature, body.pubkey);
  if (!verified) {
    sendRejectResponse(body.nonce, "Signature verification failed");
    return;
  }
  const contact = await getContactByPublicKey(body.pubkey);
  if (!contact) {
    sendRejectResponse(body.nonce, "No such contact!");
    return;
  }
  if (!contact.trusted) {
    sendRejectResponse(body.nonce, "Not trusted by receiver");
    return;
  }

  // respond to request
  const nonce = generateNonce();

  // token used by proxy to verify itself when cloning repos
  const token = nonce + "|" + signMessage(nonce);
  const response: ProxyRequestResponse = {
    status: "accepted",
    pubkey: getPublicKeyString(),
    nonce: nonce,
    signature: signMessage(nonce),
    token: token,
  };
  
  await subscribeToTopic(nonce, _handleReresponse);
  console.info(`Sending proxy request response to ${body.nonce}`);
  await publishToTopic(body.nonce, JSON.stringify(response));
};
