import { Router } from "express";
import { contactRouter } from "./contactAPI";
import { accountRouter } from "./accountAPI";
import { messageRouter } from "./messageAPI";

export const apiRouter = Router();

apiRouter.use("/message", messageRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/account", accountRouter);
