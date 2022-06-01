import { PrivyContact } from "../model/contactModel";
import { PrivyMessage, PrivyMessageReceipt } from "../model/messageModel";
import { getAllIncomingMessages, getAllOutgoingMessages, saveOutgoingMessage } from "../repo/messageRepo";
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


export const getMessagesWith = async (alias: string): Promise<PrivyMessage[]> => {
  const contact = await getContactByAlias(alias);
  if (!contact) {
    return [];
  }
  
  const incomingMessages = (await getAllIncomingMessages()) as Array<PrivyMessage>;
  const messagesFromContact =  incomingMessages.filter((msg) => msg.from == contact.alias);
  
  const otugoinMessages = (await getAllOutgoingMessages()) as Array<PrivyMessage>;
  const messagesToContact =  otugoinMessages.filter((msg) => msg.to == contact.alias);
  return messagesFromContact.concat(messagesToContact);
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
    to: encryptMessage(to.pubkey, to.pubkey),
    content: encryptMessage(msg, to.pubkey),
    timestamp: encryptMessage(sentTimestamp, to.pubkey),
    nonce: nonce,
    signature: signMessage(nonce),
  };

  subscribeToTopic(nonce, _handleResponse);

  // send message
  await publishToTopic(to.address + "/inbox", JSON.stringify(msgObject));
  //save sent message to repo, encrypted
  await saveOutgoingMessage({
    from: encryptMessage(getPublicKeyString(), getPublicKeyString()),
    to: encryptMessage(to.pubkey, getPublicKeyString()),
    content: encryptMessage(msg, getPublicKeyString()),
    timestamp: encryptMessage(sentTimestamp, getPublicKeyString()),
    nonce: nonce,
    signature: signMessage(nonce),
  });
  console.info(`Message has been sent to ${to.alias}, at ${sentTimestamp}`);
};
