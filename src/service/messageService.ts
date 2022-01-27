import { PrivyContact } from "../model/contactModel";
import { PrivyMessage } from "../model/messageModel";
import { saveMessage } from "../repo/messageRepo";
import { encryptMessage, generateNonce, signMessage } from "../util/crypto";
import { getPublicKeyString } from "./identityService";
import { publishToTopic } from "./ipfsService";

export const addMessage = async (msg: PrivyMessage) => {
  await saveMessage(msg);
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
  console.log(to.address + '/inbox')
  await publishToTopic(to.address + '/inbox', JSON.stringify(msgObject));
  console.log("Message has been sent");
};
