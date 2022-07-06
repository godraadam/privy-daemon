import { PrivyContact, PrivyContactUpdate } from "../model/contactModel";
import { sha256 } from "../util/crypto";
import { getContactRepo } from "./connectionManager";


export const saveContact = async (contact: PrivyContact) => {
  const repo = getContactRepo();
  contact = { ...contact, hash: sha256(contact.pubkey) };
  return await repo.put(contact);
};

export const findContactByAlias = async (alias: string) => {
  const repo = getContactRepo();
  const resultSet = await repo.query((contact: any) => contact.alias == alias);
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
};

export const findAllContacts = async () => {
  const repo = getContactRepo();
  return await repo.get("") as PrivyContact[];
};

export const deleteContact = async (alias: string) => {
  const repo = getContactRepo();
  const contact = await findContactByAlias(alias);
  if (!contact) {
    return null;
  }
  const hash = sha256(contact.pubkey);
  return await repo.del(hash);
};

export const findContactByAddress = async (addr: string) => {
  const repo = getContactRepo();
  const result = await repo.query((contact: any) => contact.address == addr);
  if (result.length < 1) {
    return null;
  }
  return result[0] as PrivyContact;
};

export const findContactByPublicKey = async (pubkey: string) => {
  const repo = getContactRepo();
  const hash = sha256(pubkey);
  const resultSet = await repo.get(hash) as PrivyContact[];
  if (resultSet.length < 1) {
    return null;
  }
  return resultSet[0] as PrivyContact;

};

export const updateContact = async (alias: string, payload: PrivyContactUpdate) => {
  const contact = await findContactByAlias(alias);
  if (!contact) {
    return null;
  }
  contact.alias = payload.alias;
  contact.trusted = payload.trusted;
  const repo = getContactRepo();
  return await repo.put(contact);
}
