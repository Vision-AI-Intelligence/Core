const Queue = require("bull");
const Config = require("../config");

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

downloadQueue.process(async function (job, done) {});

const zipQueue = new Queue(ZIP_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
});
function zipFile(src, data, des) {}
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
