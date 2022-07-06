import { Router } from "express";
import { removeAccountData } from "../../service/accountService";
import {
  getPublicKeyString,
  getUserAddress,
} from "../../service/identityService";

export const accountRouter = Router();

accountRouter.get("/", async (_, res) => {
  res.json({
    pubkey: getPublicKeyString(),
    address: getUserAddress(),
  });
});

accountRouter.post("/remove", async(req, res) => {
  await removeAccountData();
  res.status(200);
})
