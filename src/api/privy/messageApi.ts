import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyMessage } from "../../model/messageModel";
import { getContactByPublicKey } from "../../service/contactService";
import { addMessage } from "../../service/messageService";
import { verifySignature, decryptMessage } from "../../util/crypto";

export const handleMessage = async (msg: Message) => {
  console.log("Received message");
  const message = JSON.parse(msg.data.toString()) as PrivyMessage;

  const from = decryptMessage(message.from);
  if (!from) {
    console.log("Something went wrong when decrypting sender");
    return;
  }
  const verified = verifySignature(message.nonce, message.signature, from);
  if (!verified) {
    console.log("Signature verification failed, message discarded");
    return;
  }
  const content = decryptMessage(message.content);
  if (!content) {
    console.log("Something went wrong when decrypting message");
    return;
  }
  const alias = await getContactByPublicKey(from);
  if (!alias) {
    console.log("Sender is not a contact");
  }
  console.log(`${alias ?? from} says: ${content}`);
  await addMessage(message);
};
