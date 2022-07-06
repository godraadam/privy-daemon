import { getAllIncomingMessages, getAllOutgoingMessages, removeIncomingMessage, removeOutgoingMessage } from "../repo/messageRepo";
import { getAllContacts, removeContact } from "./contactService";

export const removeAccountData = async () => {
  // empty the databases
  const incomingMsgs = await getAllIncomingMessages();
  let hashes = incomingMsgs.map((msg) => msg.hash);
  for await (const hash of hashes) {
    if (!hash) continue;
    removeIncomingMessage(hash);
  }
  
  const outgoingMsgs = await getAllOutgoingMessages();
  hashes = outgoingMsgs.map((msg) => msg.hash);
  for await (const hash of hashes) {
    if (!hash) continue;
    removeOutgoingMessage(hash);
  }
  
  const contacts = await getAllContacts();
  const aliases = contacts.map((c) => c.alias);
  for await (const alias of aliases) {
    if (!alias) continue;
    removeContact(alias);
  }
};
