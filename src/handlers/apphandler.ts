import chalk from "chalk";
import { showBanner } from "../helpers/cli.helper";
import { ErrorService } from "../services/error.service";
import { FFmpegService } from "../services/ffmpeg.service";
import { StreamingService } from "../services/streaming.service";
import { UserInputService } from "../services/user-input.service";
import { AdaptiveHLSVideoConversionHandler } from "./adaptive-hls-convertion.handler";
import { StreamingHandler } from "./streaming.handler";
import { VideoConversionHandler } from "./video-conversion.handler";
import { VideoMergeHandler } from "./video-merge.handler";

export class AppHandler {
  private readonly services: {
    userInputService: UserInputService;
    streamingService: StreamingService;
    ffmpegService: FFmpegService;
    errorService: ErrorService;
  };

  private readonly handlers: {
    videoConversionHandler: VideoConversionHandler;
    adaptiveHLSVideoConversionHandler: AdaptiveHLSVideoConversionHandler;
    videoMergeHandler: VideoMergeHandler;
    streamingHandler: StreamingHandler;
  };

  constructor() {
    this.services = {
      userInputService: new UserInputService(),
      streamingService: new StreamingService(),
      ffmpegService: new FFmpegService(),
      errorService: new ErrorService(),
    };

    this.handlers = {
      adaptiveHLSVideoConversionHandler: new AdaptiveHLSVideoConversionHandler(
        this.services.userInputService,
        this.services.ffmpegService,
        this.services.errorService
      ),
      videoConversionHandler: new VideoConversionHandler(
        this.services.userInputService,
        this.services.ffmpegService,
        this.services.errorService
      ),
      videoMergeHandler: new VideoMergeHandler(
        this.services.userInputService,
        this.services.ffmpegService,
        this.services.errorService
      ),
      streamingHandler: new StreamingHandler(
        this.services.userInputService,
        this.services.streamingService,
        this.services.errorService
      ),
    };
  }

  async run() {
    showBanner();
    console.log(chalk.cyan("\n🎥 Welcome to Video CLI!\n"));

    const task = await this.services.userInputService.askForTask();

    switch (task) {
      case "Convert a video":
        await this.handlers.videoConversionHandler.run();
        break;
      case "Merge multiple videos":
        await this.handlers.videoMergeHandler.run();
        break;
      case "Host M3U8 stream":
        await this.handlers.streamingHandler.run();
        break;
      case "Adaptive HLS Conversion":
        await this.handlers.adaptiveHLSVideoConversionHandler.run();
        break;
      default:
        console.error("Invalid task selected.");
    }
  }
}
