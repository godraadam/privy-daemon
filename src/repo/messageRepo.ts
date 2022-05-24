import { PrivyMessage } from "../model/messageModel";
import { sha256 } from "../util/crypto";
import { getMessageRepo } from "./connectionManager";

export const getAllMessages = async () => {
  const msgdb = getMessageRepo();
  return await msgdb.get("");
};

export const saveMessage = async (msg: PrivyMessage) => {
  const msgdb = getMessageRepo();
  msg = {...msg, hash: sha256(`${msg.timestamp}${msg.from}${msg.content}`)}
  return await msgdb.put(msg);
};
