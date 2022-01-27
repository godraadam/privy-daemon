import express from "express";
import { apiRouter } from "./api/cmd/indexAPI";

const main = async () => {
  // startup local http server
  const app = express();

  app.use(express.json());
  app.use("/api", apiRouter);

  app.get("/", (_: any, res: any) => {
    res.send("privy beta");
  });

  const port = 8668;
  app.listen(port, () => {
    console.log(`privy daemon started and listening on port ${port}`);
    console.log("done");
  });
};

main();
