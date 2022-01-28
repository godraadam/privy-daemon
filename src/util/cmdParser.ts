import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

export const parseCommandLine = async () => 
  yargs(hideBin(process.argv))
    .option("type", {
      alias: "t",
      describe: "Specify node type",
      default: "origin",
      choices: ["origin", "remote", "proxy"],
    })
    .option("port", {
      alias: "p",
      describe: "Define the port the node listens on",
      default: 8668,
    })
    .option("username", {
      alias: "u",
      type: "string",
    })
    .option("password", {
      alias: "pw",
      type: "string",
    })
    .option("pubkey", {
        alias:"pk",
        describe: "The public key of the proxied user. Only when starting as a proxy node",
        type:"string"
    })
    .help()
    .version()
    .parse();
