import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getAllIncomingMessages,
  getAllOutgoingMessages,
} from "../../repo/messageRepo";
import { getContactByAlias } from "../../service/contactService";
import { getMessagesWith, removeAllMessagesWith, removeMessage, sendMessage } from "../../service/messageService";

export const messageRouter = Router();

messageRouter.get("/all-incoming", async (_, res) => {
  res.json(await getAllIncomingMessages());
});

messageRouter.get("/all-outgoing", async (_, res) => {
  res.json(await getAllOutgoingMessages());
});

messageRouter.get("/with/:alias", async (req, res) => {
  const messages = await getMessagesWith(req.params.alias);
  messages.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
  res.json(messages);
});

messageRouter.post("/send", async (req, res) => {
  const body = req.body;
  const to = await getContactByAlias(body.to);
  if (!to) {
    res.status(StatusCodes.NOT_FOUND).send("Contact not found!");
    return;
  }
  await sendMessage(body.msg, to, () => {});
  res.sendStatus(StatusCodes.OK);
});

messageRouter.delete("/rm", async (req, res) => {
  if (!req.body.hash) {
    res.sendStatus(StatusCodes.BAD_REQUEST);
    return;
  }
  const msg = await removeMessage(req.body.hash);
  if (!msg) {
    res.sendStatus(StatusCodes.NOT_FOUND);
    return;
  }
  res.sendStatus(StatusCodes.OK);
});

messageRouter.delete("/rm/all-with/:alias", async (req, res) => {
  const contact = await getContactByAlias(req.params.alias);
  if (!contact) {
    res.sendStatus(StatusCodes.NOT_FOUND);
    return;
  }
  removeAllMessagesWith(req.params.alias);
  res.sendStatus(StatusCodes.OK);
})
