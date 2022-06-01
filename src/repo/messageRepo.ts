import { PrivyMessage } from "../model/messageModel";
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
      to: "self",
      timestamp: decryptMessage(msg.timestamp) ?? "DECRYPTION ERROR",
      content: decryptMessage(msg.content) ?? "DECRYPTION ERROR",
      signature: msg.signature,
      nonce: msg.nonce,
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
    };
    return decryptedMessage;
  }));
  return incomingMessagesDecrypted;
};

export const saveIncomingMessage = async (msg: PrivyMessage) => {
  const msgdb = getIncomingMessageRepo();
  msg = { ...msg, hash: sha256(`${msg.timestamp}${msg.from}${msg.content}`) };
  return await msgdb.put(msg);
};

export const saveOutgoingMessage = async (msg: PrivyMessage) => {
  const msgdb = getOutgoingMessageRepo();
  msg = { ...msg, hash: sha256(`${msg.timestamp}${msg.from}${msg.content}`) };
  return await msgdb.put(msg);
}
