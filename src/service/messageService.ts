import { PrivyContact } from "../model/contactModel";
import { PrivyMessage } from "../model/messageModel";
import { getAllMessages, saveMessage } from "../repo/messageRepo";
import { encryptMessage, generateNonce, signMessage } from "../util/crypto";
import { getContactByAlias } from "./contactService";
import { getPublicKeyString } from "./identityService";
import { publishToTopic } from "./ipfsService";

export const addMessage = async (msg: PrivyMessage) => {
  await saveMessage(msg);
};

export const getMessagesWith = async (alias: string) => {
  const messages = (await getAllMessages()) as Array<PrivyMessage>;
  const contact = await getContactByAlias(alias);
  if (!contact) {
    return [];
  }
  return messages.filter((msg) => msg.from == contact.alias);
};

export const sendMessage = async (msg: string, to: PrivyContact) => {
  // construct Message object
  const nonce = generateNonce();
  const msgObject: PrivyMessage = {
    from: encryptMessage(getPublicKeyString(), to.pubkey),
    content: encryptMessage(msg, to.pubkey),
    timestamp: encryptMessage(Date.now().toString(), to.pubkey),
    nonce: nonce,
    signature: signMessage(nonce),
  };

  // send message
  await publishToTopic(to.address + "/inbox", JSON.stringify(msgObject));
  console.log("Message has been sent");
};
