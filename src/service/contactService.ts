import { PrivyContact } from "../model/contactModel";
import {
  ProxyRequest,
  ProxyRequestResponse,
  ProxyRequestResponseSuccess,
} from "../model/requestModel";
import {
  deleteContact,
  findAllContacts,
  findContactByAddress,
  findContactByAlias,
  findContactByPublicKey,
  saveContact,
} from "../repo/contactRepo";
import {
  generateNonce,
  sha256,
  signMessage,
  verifySignature,
} from "../util/crypto";
import { getPublicKeyString } from "./identityService";
import { publishToTopic, subscribeToTopic } from "./ipfsService";
import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyError } from "../model/errors";

export const removeContact = async (alias: string) => {
  return await deleteContact(alias);
};

export const addContact = async (contact: PrivyContact) => {
  // by default, not trusted
  if (contact.trusted === undefined) {
    contact.trusted = false;
  }
  return await saveContact(contact);
};

export const getContactByAlias = async (alias: string) => {
  return await findContactByAlias(alias);
};

export const getAllContacts = async () => {
  return await findAllContacts();
};

export const getContactByAddress = async (addr: string) => {
  return await findContactByAddress(addr);
};

export const getContactByPublicKey = async (pubkey: string) => {
  return await findContactByPublicKey(pubkey);
};

export const isAddressContact = async (addr : string) => {
  return !!(await findContactByAddress(addr));
}

export const contactSetTrusted = async (alias: string, trusted: boolean) => {
  const contact = await getContactByAlias(alias);
  if (!contact) {
    return null;
  }
  contact.trusted = trusted;
  return await saveContact(contact);
};

export const isPubKeyTrusted = async (pubkey: string) => {
  const contact = await getContactByPublicKey(pubkey);
  if (!contact) {
    return false;
  }
  return contact.trusted;
};

export const addProxy = async (
  contact: PrivyContact,
  callback: (err?: PrivyError) => void
) => {
  const nonce = generateNonce();

  const handleResponse = async (msg: Message) => {
    const body = JSON.parse(msg.data.toString()) as ProxyRequestResponse;
    
    if (body.status === "rejected") {
      callback(PrivyError.REQUEST_REJECTED);
    }
    
    const resp = body as ProxyRequestResponseSuccess;

    const verified = verifySignature(resp.nonce, resp.signature, resp.pubkey);
    if (!verified) {
      callback(PrivyError.INVALID_SIGNATURE);
    }
    console.log(`${contact.alias} accepted your proxy reuest`);
    callback();
  };

  const request: ProxyRequest = {
    pubkey: getPublicKeyString(),
    nonce: nonce,
    signature: signMessage(nonce),
  };

  // sub to response channel
  await subscribeToTopic(nonce, handleResponse);

  await publishToTopic(
    contact.address + "/request/proxy",
    JSON.stringify(request)
  );
};
