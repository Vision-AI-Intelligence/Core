const Queue = require("bull");
const Config = require("../config");
const axios = require("axios").default;
const DataValidation = require("../misc/DataValidation");
const { default: Axios } = require("axios");
const fs = require("fs");
const path = require("path");
const { setQueues } = require("bull-board");
const childProcess = require("child_process");
const admin = require("firebase-admin");

function jobLogging(bid, jobId, type, status, message) {
  admin
    .firestore()
    .collection("buckets")
    .doc(bid)
    .collection("jobs")
    .doc(jobId)
    .set({
      id: jobId,
      time: Date.now(),
      type: type,
      status: status,
      message: message,
    });
}

const DOWNLOAD_QUEUE = "DOWNLOAD_QUEUE";
const ZIP_QUEUE = "ZIP_QUEUE";
const UNZIP_QUEUE = "UNZIP_QUEUE";

const downloadQueue = new Queue(DOWNLOAD_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
  settings: {
    maxStalledCount: 2,
    stalledInterval: 1,
  },
});

downloadQueue.process(async function (job, done) {
  const { url, bid, des } = job.data;
  jobLogging(bid, job.id, DOWNLOAD_QUEUE, "Pending", "");
  if (!DataValidation.allNotUndefined(url, des)) {
    jobLogging(bid, job.id, DOWNLOAD_QUEUE, "Error", "");
    done(new Error("Url, bucket id and destination directory are required"));
    return;
  }
  const { data, headers } = await Axios({
    url: url,
    method: "GET",
    responseType: "stream",
  });
  const totalLength = headers["content-length"];
  const writer = fs.createWriteStream(path.join(Config.bucketSite, bid, des));
  writer.on("error", (err) => {
    jobLogging(bid, job.id, DOWNLOAD_QUEUE, "Error", err.message);
    done(err);
  });
  writer.on("close", () => {
    jobLogging(bid, job.id, DOWNLOAD_QUEUE, "Finished", "");
    done();
  });
  let current = 0;
  data.on("data", (chuck) => {
    current += chuck.length;
    job.progress((current / totalLength) * 100);
  });
  data.pipe(writer);
});

const zipQueue = new Queue(ZIP_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
  settings: {
    maxStalledCount: 2,
    stalledInterval: 1,
  },
});

zipQueue.process((job, done) => {
  const { bid, dir, output } = job.data;
  if (!DataValidation.allNotUndefined(dir, output)) {
    done(new Error("Require directory and output"));
    return;
  }
  jobLogging(bid, job.id, ZIP_QUEUE, "Pending", "");
  let subprocess = childProcess.spawn("zip", [output, dir]);
  job.progress(100);
  subprocess.on("error", (err) => {
    jobLogging(bid, job.id, ZIP_QUEUE, "Error", err.message);
    done(err);
  });
  subprocess.on("close", (code, signal) => {
    jobLogging(bid, job.id, ZIP_QUEUE, "Finished", "");
    done(code);
  });
});

const unzipQueue = new Queue(UNZIP_QUEUE, {
  redis: {
    host: Config.redisHost,
    port: Config.redisPort,
    password: Config.redisSecret,
  },
  settings: {
    maxStalledCount: 2,
    stalledInterval: 1,
  },
});
unzipQueue.process((job, done) => {
  const { bid, dir, output } = job.data;
  if (!DataValidation.allNotUndefined(dir, output)) {
    done(new Error("Require directory and output"));
    return;
  }
  jobLogging(bid, job.id, UNZIP_QUEUE, "Pending", "");
  let subprocess = childProcess.spawn("unzip", [output, dir]);
  job.progress(100);
  subprocess.on("error", (err) => {
    jobLogging(bid, job.id, UNZIP_QUEUE, "Error", err.message);
    done(err);
  });
  subprocess.on("close", (code, signal) => {
    jobLogging(bid, job.id, UNZIP_QUEUE, "Finished", "");
    done(code);
  });
});

setQueues([downloadQueue, zipQueue, unzipQueue]);

module.exports = {
  queue: {
    downloadJob: downloadQueue,
    zip: zipQueue,
    unzip: unzipQueue,
  },
};
