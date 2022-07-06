import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { PrivyContact, PrivyContactCreate, PrivyContactUpdate } from "../../model/contactModel";
import { PrivyError } from "../../model/errors";
import { updateContact } from "../../repo/contactRepo";
import { deriveAddressFromPublicKey } from "../../service/addressService";
import {
  addContact,
  contactSetTrusted,
  getAllContacts,
  getContactByAlias,
  getContactByPublicKey,
  removeContact,
} from "../../service/contactService";
import { sendProxyrequest } from "../../service/proxyService";

export const contactRouter = Router();

contactRouter.post("/add", async (req, res) => {
  const payload = req.body as PrivyContactCreate;
  const contact: PrivyContact = {
      alias: payload.alias,
      pubkey: payload.pubkey,
      trusted: payload.trusted ?? false,
      address: deriveAddressFromPublicKey(payload.pubkey),
      proxy: false
  }
  await addContact(contact);
  res.status(StatusCodes.OK).send();
});

contactRouter.get("/ls", async (req, res) => {
  const contacts = await getAllContacts();
  res.status(StatusCodes.OK).json(contacts).send();
});

contactRouter.get("/:alias", async (req, res) => {
  const contact = await getContactByAlias(req.params.alias);
  res.status(StatusCodes.OK).json(contact).send();
});

contactRouter.delete("/rm/:alias", async (req, res) => {
  const hash = await removeContact(req.params.alias);
  console.info(hash)
  if (!hash) {
    res.status(StatusCodes.NOT_FOUND).send();
    return;
  }
  res.status(StatusCodes.OK).json(hash).send();
});

contactRouter.put("/:alias", async (req, res) => {
  const alias = req.params.alias;
  const payload = req.body as PrivyContactUpdate;
  const updatedContact = await updateContact(alias, payload)
  if (!updatedContact) {
    res
    .status(StatusCodes.NOT_FOUND)
    .send(`${req.params.alias} is not a contact`);
  return;
  }
  res.status(StatusCodes.OK).json(updateContact).send();
});


contactRouter.post("/add-proxy/:alias", async (req, res) => {
  console.info(`Received proxy request from client...`)
  const contact = await getContactByAlias(req.params.alias);
  if (!contact) {
    console.info(`No contact with alias ${req.params.alias} found!`)
    res
      .status(StatusCodes.NOT_FOUND)
      .send(`${req.params.alias} is not a contact`);
    return;
  }
  if (!contact.trusted) {
    console.info(`Contact ${contact.username} not trusted hence cannot be a proxy!`)
    res.status(StatusCodes.BAD_REQUEST).send(`${req.params.alias} is not a trusted contact!`);
    return;
  }
  await sendProxyrequest(contact, (err?: PrivyError) => {
    if (err) {
      console.info(`An error occured during the proxy request: ${err.toString()}!`)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(`The following error occured: ${err.toString()}`);
      return;
    }
    else {
      res.status(StatusCodes.OK).json(contact);
    }
  });
  
  res.sendStatus(StatusCodes.OK);
});
