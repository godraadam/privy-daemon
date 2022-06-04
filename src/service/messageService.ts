import { PrivyContact } from "../model/contactModel";
import { PrivyMessage, PrivyMessageInRepo, PrivyMessageReceipt } from "../model/messageModel";
import { getAllIncomingMessages, getAllOutgoingMessages, saveOutgoingMessage, updateOutgoingMessage } from "../repo/messageRepo";
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

const timeoutLength = 5000;


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
    const pubKeyDecrypted = decryptMessage(response.pubkey);
    
    const verified = pubKeyDecrypted && verifySignature(
      response.nonce,
      response.signature,
      pubKeyDecrypted
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
        `Message receipt received from ${pubKeyDecrypted} at ${deliveryTime}`
      );
      // additional logic here
      // set delivered, save again
      console.info("Updating message record with delivered field: delivered");
      updateOutgoingMessage(hash, {delivered: "delivered"});
      delivered = true;
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

  // delivery confirmation business
  await subscribeToTopic(nonce, _handleResponse);
  let delivered = false;
  
  // set timeout: if no confirmation received, set delivered status to false
  // and stop waiting for confirmation
  setTimeout(() => {
    if (!delivered) {
      console.info("Updating message record with delivered field: failed");
      updateOutgoingMessage(hash, {delivered: "failed"});
      unSubscribeFromTopic(nonce);
    }
  }, timeoutLength)

  // send message
  await publishToTopic(to.address + "/inbox", JSON.stringify(msgObject));
  
  //save sent message to repo, encrypted
  const hash = await saveOutgoingMessage({
    from: encryptMessage(getPublicKeyString(), getPublicKeyString()),
    to: encryptMessage(to.pubkey, getPublicKeyString()),
    content: encryptMessage(msg, getPublicKeyString()),
    timestamp: encryptMessage(sentTimestamp, getPublicKeyString()),
    nonce: nonce,
    signature: signMessage(nonce),
    delivered: "undetermined",
    seen:false
  });
  console.info(`Message has been sent to ${to.alias}, at ${sentTimestamp}`);
};
