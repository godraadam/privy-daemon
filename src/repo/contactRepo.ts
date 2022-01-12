import { PrivyContact } from "../model/contactModel";
import { sha256 } from "../util/crypto";
import { getContactRepo } from "./connectionManager";

// TODO: encrypt data when saving, decrypt when reading

export const saveContact = async (contact: PrivyContact) => {
  const repo = getContactRepo();
  contact = { ...contact, hash: sha256(contact.alias) };
  return await repo.put(contact);
};

export const findContactByAlias = async (alias: string) => {
  const repo = getContactRepo();
  const hash = sha256(alias);
  const resultSet = repo.get(hash) as PrivyContact[];
  if (!resultSet.length) {
    return null;
  }
  return resultSet[0];
};

export const findAllContacts = async () => {
  const repo = getContactRepo();
  return repo.get("") as PrivyContact[];
};

export const deleteContact = async (alias: string) => {
  const repo = getContactRepo();
  const hash = sha256(alias);
  const friend = findContactByAlias(hash);
  if (!friend) {
    return null;
  }
  return await repo.del(hash);
};

export const findContactByAddress = async (addr : string) => {
  const repo = getContactRepo();
  const result = await repo.query((contact : any) => contact.address == addr)
  if (result.length < 1) {
    return null;
  }
  return result[0] as PrivyContact;
}
