import {
  PrivyMessage,
  PrivyMessageInRepo,
  PrivyMessageUpdate,
} from "../model/messageModel";
import { getContactByPublicKey } from "../service/contactService";
import { decryptMessage, sha256 } from "../util/crypto";
import {
  getIncomingMessageRepo,
  getOutgoingMessageRepo,
} from "./connectionManager";

const _getAllInOrOutgoingMessages = async (repo: any): Promise<PrivyMessageInRepo[]> => {
  const allMessages = (await repo.get("")) as PrivyMessageInRepo[];
  const messagesDecrypted = Promise.all(
    allMessages.map(async (msg) => {
      const fromPubKey = decryptMessage(msg.from) ?? "";
      const from = await getContactByPublicKey(fromPubKey);
      const fromAlias = from ? from.alias : "DECRYPTION_ERROR";

      const toPubKey = decryptMessage(msg.to) ?? "";
      const to = await getContactByPublicKey(toPubKey);
      const toAlias = to ? to.alias : "DECRYPTION_ERROR";

      const decryptedMessage: PrivyMessageInRepo = {
        hash: msg.hash,
        from: fromAlias,
        to: toAlias,
        timestamp: decryptMessage(msg.timestamp) ?? "DECRYPTION ERROR",
        content: decryptMessage(msg.content) ?? "DECRYPTION ERROR",
        signature: msg.signature,
        nonce: msg.nonce,
        delivered: msg.delivered,
        seen: msg.seen,
      };
      return decryptedMessage;
    })
  );
  return messagesDecrypted;
}

export const getAllIncomingMessages = async () =>  await _getAllInOrOutgoingMessages(getIncomingMessageRepo());

export const getAllOutgoingMessages = async () =>  await _getAllInOrOutgoingMessages(getOutgoingMessageRepo());

export const getIncomingMessageByHash = async (hash: string): Promise<PrivyMessageInRepo | null> => {
  const msgdb = getIncomingMessageRepo();
  const resultSet = (await msgdb.get(hash)) as PrivyMessageInRepo[];
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
};

export const updateIncomingMessage = async (
  hash: string,
  msgObj: PrivyMessageUpdate
) => {
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
};

export const getOutgoingMessageByHash = async (
  hash: string
): Promise<PrivyMessageInRepo | null> => {
  const msgdb = getOutgoingMessageRepo();
  const resultSet = (await msgdb.get(hash)) as PrivyMessageInRepo[];
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
};

export const updateOutgoingMessage = async (
  hash: string,
  msgObj: PrivyMessageUpdate
) => {
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
};

const _saveInOrOutgoingMessage = async (repo: any, msg: PrivyMessageInRepo) => {
  const hash = hashMessage(msg);
  msg = { ...msg, hash: hash };
  await repo.put(msg);
  return hash;
}

export const saveIncomingMessage = async (msg: PrivyMessageInRepo) => _saveInOrOutgoingMessage(getIncomingMessageRepo(), msg);

export const saveOutgoingMessage = async (msg: PrivyMessageInRepo) => _saveInOrOutgoingMessage(getOutgoingMessageRepo(), msg);

const _removeInOrOutgoingMessage = async (repo: any, hash: string) => {
  const resultSet = repo.get(hash) as PrivyMessageInRepo[];
  if (!resultSet.length) {
    return null;
  }
  return await repo.del(hash);
}

export const removeOutgoingMessage = async (hash: string) => _removeInOrOutgoingMessage(getOutgoingMessageRepo(), hash);
export const removeIncomingMessage = async (hash: string) => _removeInOrOutgoingMessage(getIncomingMessageRepo(), hash);

const hashMessage = (msg: PrivyMessage) => {
  return sha256(`${msg.timestamp}${msg.from}${msg.content}`);
};
