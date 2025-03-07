import chalk from "chalk";
import path from "path";
import { defaultVideoConfig } from "../configs/default-video.config";
import type { ErrorService } from "../services/error.service";
import type { StreamingService } from "../services/streaming.service";
import type { UserInputService } from "../services/user-input.service";

export class StreamingHandler {
  constructor(
    private readonly userInputService: UserInputService,
    private readonly streamingService: StreamingService,
    private readonly errorService: ErrorService
  ) {}

  async run() {
    const directory = await this.userInputService.askForM3U8Directory();
    const port = await this.userInputService.askForStreamingPort();

    const VIDEO_DIR = path.resolve(directory);
    const PORT = port || defaultVideoConfig.port;

    console.log(
      chalk.green(`🚀 Serving videos from: ${VIDEO_DIR} on port ${PORT}`)
    );

    try {
      await this.streamingService.startServer(VIDEO_DIR, PORT);
    } catch (error) {
      this.errorService.handleError(
        error,
        "❌ Failed to start streaming service:"
      );
    }
  }
}
