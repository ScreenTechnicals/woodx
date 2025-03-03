import fs from "fs";
import inquirer from "inquirer";

export class CLIHelper {
  static async askForVideoDir(): Promise<string> {
    const { videoDir } = await inquirer.prompt([
      {
        type: "input",
        name: "videoDir",
        message: "📁 Enter the directory where videos are stored:",
        default: process.cwd(),
        validate: (dir) => {
          if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return "❌ Invalid directory!";
          }
          return true;
        },
      },
    ]);
    return videoDir;
  }
}
