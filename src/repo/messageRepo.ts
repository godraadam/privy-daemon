import { PrivyMessage } from "../model/messageModel";
import { getMessageRepo } from "./connectionManager";

export const getAllMessages = async () => {
  const msgdb = getMessageRepo();
  return await msgdb.get("");
};

export const saveMessage = async (msg: PrivyMessage) => {
  const msgdb = getMessageRepo();
  return await msgdb.put(msg);
};
