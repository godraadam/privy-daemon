import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyMessage } from "../../model/messageModel";
import { getContactByPublicKey } from "../../service/contactService";
import { addMessage } from "../../service/messageService";
import { verifySignature, decryptMessage } from "../../util/crypto";

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
  console.info(`${contact ? contact.alias : from} says: ${content}\nSent at ${/*new Date(timestamp).toLocaleDateString()*/timestamp}, delivered at ${Date.now().toLocaleString()}`);
  await addMessage(message);
};
