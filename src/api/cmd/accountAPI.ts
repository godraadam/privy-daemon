import { Router } from "express";
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
