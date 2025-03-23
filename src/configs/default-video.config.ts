export const defaultVideoConfig = {
  port: 9003,
  videoResolutions: {
    "144p": "256x144",
    "240p": "426x240",
    "360p": "640x360",
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
    "1440p": "2560x1440",
    "2160p": "3840x2160"
  },
  videoBitrates: {
    "144p": "250k",
    "240p": "500k",
    "360p": "1000k",
    "480p": "1500k",
    "720p": "3500k",
    "1080p": "6000k",
    "1440p": "12000k",
    "2160p": "25000k",
  },
  videoFormats: ["mp4", "webm", "avi", "mov", "m3u8"],
  format: "mp4",
  resolution: "720p",
  output: "./outputs",
};
