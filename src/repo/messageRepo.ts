import { PrivyMessage, PrivyMessageUpdate } from "../model/messageModel";
import { getContactByPublicKey } from "../service/contactService";
import { decryptMessage, sha256 } from "../util/crypto";
import { getIncomingMessageRepo, getOutgoingMessageRepo } from "./connectionManager";

export const getAllIncomingMessages = async () => {
  const msgdb = getIncomingMessageRepo();
  const allIncomingMessages = (await msgdb.get("")) as PrivyMessage[];
  const incomingMessagesDecrypted = Promise.all(allIncomingMessages.map(async (msg) => {
    const fromPubKey = decryptMessage(msg.from) ?? "";
    const from = await getContactByPublicKey(fromPubKey);
    const fromAlias = from ? from.alias : "DECRYPTION_ERROR";
    
    const toPubKey = decryptMessage(msg.to) ?? "";
    const to = await getContactByPublicKey(toPubKey);
    const toAlias = to ? to.alias : "DECRYPTION_ERROR";

    const decryptedMessage: PrivyMessage = {
      from: fromAlias,
      to: toAlias,
      timestamp: decryptMessage(msg.timestamp) ?? "DECRYPTION ERROR",
      content: decryptMessage(msg.content) ?? "DECRYPTION ERROR",
      signature: msg.signature,
      nonce: msg.nonce,
      delivered: msg.delivered,
      seen: msg.seen
    };
    return decryptedMessage;
  }));
  return incomingMessagesDecrypted;
};

export const getAllOutgoingMessages = async () => {
  const msgdb = getOutgoingMessageRepo();
  const allIncomingMessages = (await msgdb.get("")) as PrivyMessage[];
  const incomingMessagesDecrypted = Promise.all(allIncomingMessages.map(async (msg) => {
    const fromPubKey = decryptMessage(msg.from) ?? "";
    const from = await getContactByPublicKey(fromPubKey);
    const fromAlias = from ? from.alias : "DECRYPTION_ERROR";
    
    const toPubKey = decryptMessage(msg.to) ?? "";
    const to = await getContactByPublicKey(toPubKey);
    const toAlias = to ? to.alias : "DECRYPTION_ERROR";

    const decryptedMessage: PrivyMessage = {
      from: fromAlias,
      to: toAlias,
      timestamp: decryptMessage(msg.timestamp) ?? "DECRYPTION ERROR",
      content: decryptMessage(msg.content) ?? "DECRYPTION ERROR",
      signature: msg.signature,
      nonce: msg.nonce,
      delivered: msg.delivered,
      seen: msg.seen
    };
    return decryptedMessage;
  }));
  return incomingMessagesDecrypted;
};

export const getIncomingMessageByHash = async (hash: string) => {
  const msgdb = getIncomingMessageRepo();
  const resultSet = await msgdb.get(hash) as PrivyMessage[];
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
}

export const updateIncomingMessage = async (hash: string, msgObj: PrivyMessageUpdate) => {
  const msgFromRepo = await getIncomingMessageByHash(hash);
  if (!msgFromRepo) {
    return null;
  }
  if (msgObj.delivered != null) {
    msgFromRepo.delivered = msgObj.delivered;
  }
  if (msgObj.seen != null) {
    msgFromRepo.seen = msgObj.seen;
  }
  return await saveIncomingMessage(msgFromRepo);
}

export const getOutgoingMessageByHash = async (hash: string) => {
  const msgdb = getOutgoingMessageRepo();
  const resultSet = await msgdb.get(hash) as PrivyMessage[];
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
}

export const updateOutgoingMessage = async (hash: string, msgObj: PrivyMessageUpdate) => {
  const msgFromRepo = await getOutgoingMessageByHash(hash);
  if (!msgFromRepo) {
    return null;
  }
  if (msgObj.delivered != null) {
    msgFromRepo.delivered = msgObj.delivered;
  }
  if (msgObj.seen != null) {
    msgFromRepo.seen = msgObj.seen;
  }
  return await saveOutgoingMessage(msgFromRepo);
}

export const saveIncomingMessage = async (msg: PrivyMessage) => {
  const msgdb = getIncomingMessageRepo();
  const hash = hashMessage(msg);
  msg = { ...msg, hash: hash };
  await msgdb.put(msg);
  return hash;
};

export const saveOutgoingMessage = async (msg: PrivyMessage) => {
  const msgdb = getOutgoingMessageRepo();
  const hash = hashMessage(msg);
  msg = { ...msg, hash: hash };
  await msgdb.put(msg);
  return hash;
}

const hashMessage = (msg: PrivyMessage) => {
  return sha256(`${msg.timestamp}${msg.from}${msg.content}`);
}
