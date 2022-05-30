import { PrivyContact } from "../model/contactModel";
import { PrivyMessage, PrivyMessageReceipt } from "../model/messageModel";
import { getAllMessages, saveMessage } from "../repo/messageRepo";
import {
  decryptMessage,
  encryptMessage,
  generateNonce,
  signMessage,
  verifySignature,
} from "../util/crypto";
import { getContactByAlias } from "./contactService";
import { getPublicKeyString } from "./identityService";
import {
  publishToTopic,
  subscribeToTopic,
  unSubscribeFromTopic,
} from "./ipfsService";
import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyError } from "../model/errors";

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

export const sendMessage = async (
  msg: string,
  to: PrivyContact,
  callback: (err?: PrivyError) => void
) => {
  const _handleResponse = async (msg: Message) => {
    const response = JSON.parse(msg.data.toString()) as PrivyMessageReceipt;
    const verified = verifySignature(
      response.nonce,
      response.signature,
      response.pubkey
    );

    if (!verified) {
      console.error(
        "Message receipt signature verification failed, dropping message.."
      );
      callback(PrivyError.INVALID_SIGNATURE);
    }
    if (verified) {
      const deliveryTime = decryptMessage(response.timestamp);
      console.info(
        `Message receipt received from ${response.pubkey} at ${deliveryTime}`
      );
      // additional logic here
    }
    unSubscribeFromTopic(nonce);
    callback();
  };

  // construct Message object
  const nonce = generateNonce();
  const sentTimestamp = Date.now().toString();
  const msgObject: PrivyMessage = {
    from: encryptMessage(getPublicKeyString(), to.pubkey),
    content: encryptMessage(msg, to.pubkey),
    timestamp: encryptMessage(sentTimestamp, to.pubkey),
    nonce: nonce,
    signature: signMessage(nonce),
  };

  subscribeToTopic(nonce, _handleResponse);

  // send message
  await publishToTopic(to.address + "/inbox", JSON.stringify(msgObject));
  console.info(`Message has been sent to ${to.alias}, at ${sentTimestamp}`);
};
