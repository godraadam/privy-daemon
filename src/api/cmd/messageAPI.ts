import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { getAllIncomingMessages, getAllOutgoingMessages } from "../../repo/messageRepo";
import { getContactByAlias } from "../../service/contactService";
import { getMessagesWith, sendMessage } from "../../service/messageService";

export const messageRouter = Router();

messageRouter.get("/all-incoming", async (_, res) => {
  res.json(await getAllIncomingMessages())
});

messageRouter.get("/all-outgoing", async (_, res) => {
  res.json(await getAllOutgoingMessages())
});

messageRouter.get("/with/:alias", async (req, res) => {
  const messages = await getMessagesWith(req.params.alias)
  messages.sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
  res.json(messages)
})

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
