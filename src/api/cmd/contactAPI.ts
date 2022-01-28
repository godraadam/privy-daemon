import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { PrivyContact, PrivyContactCreate } from "../../model/contactModel";
import { deriveAddressFromPublicKey } from "../../service/addressService";
import {
  addContact,
  contactSetTrusted,
  getAllContacts,
  getContactByAlias,
  removeContact,
} from "../../service/contactService";

export const contactRouter = Router();

contactRouter.post("/add", async (req, res) => {
  const payload = req.body as PrivyContactCreate;
  const contact: PrivyContact = {
      alias: payload.alias,
      pubkey: payload.pubkey,
      trusted: payload.trusted ?? false,
      address: deriveAddressFromPublicKey(payload.pubkey)
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
  if (!hash) {
    res.status(StatusCodes.NOT_FOUND).send();
    return;
  }
  res.status(StatusCodes.OK).json(hash).send();
});

contactRouter.put("/trust:alias", async (req, res) => {
  const result = contactSetTrusted(req.params.alias, true);
  if (!result) {
    res
      .status(StatusCodes.NOT_FOUND)
      .send(`${req.params.alias} is not a contact`);
    return;
  }
  res.sendStatus(StatusCodes.OK);
});

contactRouter.put("/untrust:alias", async (req, res) => {
  const result = await contactSetTrusted(req.params.alias, false);
  if (!result) {
    res
      .status(StatusCodes.NOT_FOUND)
      .send(`${req.params.alias} is not a contact`);
    return;
  }
  res.sendStatus(StatusCodes.OK);
});

contactRouter.post("/add-proxy:alias", async (req, res) => {
  const contact = await getContactByAlias(req.params.alias);
  if (!contact) {
    res
      .status(StatusCodes.NOT_FOUND)
      .send(`${req.params.alias} is not a contact`);
    return;
  }
  // add proxy logic here
  res.sendStatus(StatusCodes.OK);
});
