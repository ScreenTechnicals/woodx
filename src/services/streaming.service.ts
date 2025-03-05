import chalk from "chalk";
import fs from "fs";
import path from "path";
import { $ } from "zx";

export class StreamingService {
  private videoBaseDir: string;
  private port: number;

  constructor(videoBaseDir: string, port = 9003) {
    this.videoBaseDir = path.resolve(videoBaseDir);
    this.port = port;

    if (!fs.existsSync(this.videoBaseDir)) {
      console.error(
        chalk.red(`❌ Video directory does not exist: ${this.videoBaseDir}`)
      );
      process.exit(1);
    }
  }

  private async isCaddyInstalled(): Promise<boolean> {
    try {
      await $`caddy version`;
      return true;
    } catch {
      return false;
    }
  }

  public async startServer() {
    if (!(await this.isCaddyInstalled())) {
      console.error(
        chalk.red("❌ Caddy is not installed. Please install it first.")
      );
      process.exit(1);
    }

    console.log(
      chalk.blue(
        `🚀 Starting Caddy server on port ${this.port}, serving from ${this.videoBaseDir}...`
      )
    );

    try {
      await $`caddy file-server --listen :${this.port} --root ${this.videoBaseDir} --browse`;
    } catch (error) {
      console.error(chalk.red("❌ Failed to start Caddy server:", error));
    }
  }
}
