import { Router } from "express";
import {
  getPublicKeyString,
  getUserAddress,
  getUsername,
} from "../../service/identityService";

export const accountRouter = Router();

accountRouter.get("/", async (_, res) => {
  res.json({
    username: getUsername(),
    pubkey: getPublicKeyString(),
    address: getUserAddress(),
  });
});
