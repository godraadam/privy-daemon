import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyMessage, PrivyMessageInRepo, PrivyMessageReceipt } from "../../model/messageModel";
import { saveIncomingMessage } from "../../repo/messageRepo";
import { getContactByPublicKey } from "../../service/contactService";
import { getPublicKeyString } from "../../service/identityService";
import { publishToTopic } from "../../service/ipfsService";
import { verifySignature, decryptMessage, encryptMessage, generateNonce, signMessage } from "../../util/crypto";

export const handleMessage = async (msg: Message) => {
  console.info("Received message");
  const message = JSON.parse(msg.data.toString()) as PrivyMessage;

  const from = decryptMessage(message.from);
  if (!from) {
    console.info("Something went wrong when decrypting sender");
    return;
  }
  const verified = verifySignature(message.nonce, message.signature, from);
  if (!verified) {
    console.info("Signature verification failed, message discarded");
    return;
  }
  const content = decryptMessage(message.content);
  if (!content) {
    console.info("Something went wrong when decrypting message");
    return;
  }
  const contact = await getContactByPublicKey(from);
  if (!contact) {
    console.info("Sender is not a contact");
  }
  const timestamp = decryptMessage(message.timestamp)
  if (!timestamp) {
    console.info("Something went wrong when decrypting timestamp!");
    return;
  }
  
  console.info(`${contact ? contact.alias : from} says: ${content}\nSent at ${new Date(parseInt(timestamp)).toLocaleString()}, delivered at ${Date.now().toLocaleString()}`);
  // save to repo, encrypted
  const messageToSave: PrivyMessageInRepo = {...message, delivered:"delivered", seen:false};
  await saveIncomingMessage(messageToSave);
  
  // send receipt confirmation
  const nonce = generateNonce();
  const receiptObj: PrivyMessageReceipt = {
    status: "delivered",
    pubkey: encryptMessage(getPublicKeyString(), from),
    nonce: nonce,
    signature: signMessage(nonce),
    timestamp: encryptMessage(Date.now().toString(), from)
  };
  publishToTopic(message.nonce, JSON.stringify(receiptObj));
};
