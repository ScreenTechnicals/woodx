#!/usr/bin/env bun
import { AppHandler } from "./handlers/apphandler";

async function main() {
  const app = new AppHandler();
  app.run();
}

main();
