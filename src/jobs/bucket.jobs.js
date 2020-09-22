const Queue = require("bull");
const Config = require("../config");
const DataValidation = require("../misc/DataValidation");

const DOWNLOAD_QUEUE = "DOWNLOAD_QUEUE";
const ZIP_QUEUE = "ZIP_QUEUE";
const UNZIP_QUEUE = "UNZIP_QUEUE";

const downloadQueue = new Queue(DOWNLOAD_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
});

downloadQueue.process(async function (job, done) {
  const { url, des } = job.data;
  if (!DataValidation.allNotUndefined(url, des)) {
    done("Url and destination directory are required");
  }
});

const zipQueue = new Queue(ZIP_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
});

const unzipQueue = new Queue(UNZIP_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
});

module.exports = {
  queue: {
    downloadJob: downloadQueue,
    zip: zipQueue,
    unzip: unzipQueue,
  },
};
