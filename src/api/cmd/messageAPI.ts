import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { getContactByAlias } from "../../service/contactService";
import { sendMessage } from "../../service/messageService";

export const messageRouter = Router();

messageRouter.get("/", (req, res) => {});

messageRouter.post("/send", async (req, res) => {
  const body = req.body;
  const to = await getContactByAlias(body.to);
  if (!to) {
    res.status(StatusCodes.NOT_FOUND).send("Contact not found!");
    return;
  }
  await sendMessage(body.msg, to);
  res.sendStatus(StatusCodes.OK);
});
