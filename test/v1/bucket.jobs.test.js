const chai = require("chai");
const chaiHttp = require("chai-http");
const path = require("path");
const { bucketSite } = require("../../src/config");
const bucket = require("../../src/jobs/bucket.jobs");
const config = require("../../src/config");
const fs = require("fs");
const { assert } = require("chai");

describe("bucket.jobs", () => {
  beforeEach(() => {
    config.bypass = true;
    config.bucketTemp = "./test/sim/temp";
    config.bucketSite = "./test/sim/server";
    if (!fs.existsSync(config.bucketSite + "/dummy-bucket-001")) {
      fs.mkdirSync(config.bucketSite + "/dummy-bucket-001");
    }
  });
  it("Download file successful", async () => {
    let timestamp = Date.now().toString();
    let job = await bucket.queue.downloadJob.add({
      url:
        "https://archive.ics.uci.edu/ml/machine-learning-databases/00366/AReM.zip",
      bid: "dummy-bucket-001",
      des: "/dataset" + timestamp,
    });
    let isCompleted = await job.isCompleted();
    assert.equal(isCompleted, true);
    assert.equal(
      fs.existsSync(
        config.bucketSite + "/dummy-bucket-001/dataset" + timestamp
      ),
      true
    );
  });
  it("Zip successful", async () => {
    let job = await bucket.queue.zip.add({
      dir: "./test/sim/client/demoFolder",
      output: "./test/sim/server/dummy-bucket-001/a.zip",
    });
    job.isCompleted().then(() => console.log("Completed"));
    console.log("Done");
  });
  afterEach(() => {
    if (fs.existsSync(config.bucketSite + "/dummy-bucket-001")) {
      fs.rmdirSync(config.bucketSite + "/dummy-bucket-001", {
        recursive: true,
      });
    }
  });
});
