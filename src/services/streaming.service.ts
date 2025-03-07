import chalk from "chalk";
import open from "open";
import { $ } from "zx";

export class StreamingService {
  private async isCaddyInstalled(): Promise<boolean> {
    try {
      await $`caddy version`;
      return true;
    } catch {
      return false;
    }
  }

  public async startServer(videoBaseDir: string, port = 9003) {
    if (!(await this.isCaddyInstalled())) {
      throw new Error("❌ Caddy is not installed. Please install it first.");
    }

    console.log(
      chalk.blue(
        `🚀 Starting Caddy server on port ${port}, serving from ${videoBaseDir}...`
      )
    );

    try {
      const localServer = `http://localhost:${port}`;

      console.log(chalk.green(`Starting at ${localServer} 🚀`));

      $`caddy file-server --listen :${port} --root ${videoBaseDir} --browse`;

      open(`${localServer}`);
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);
      else throw new Error("Streaming Failed!");
    }
  }
}
