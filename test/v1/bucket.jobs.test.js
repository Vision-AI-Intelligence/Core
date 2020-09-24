const chai = require("chai");
const chaiHttp = require("chai-http");
const path = require("path");
const { bucketSite } = require("../../src/config");
const bucket = require("../../src/jobs/bucket.jobs");
const config = require("../../src/config");
const fs = require("fs");

before(() => {
  config.bypass = true;
  config.bucketTemp = "./test/sim/temp";
  config.bucketSite = "./test/sim/server";
  fs.mkdirSync(config.bucketSite + "/dummy-bucket-001");
});
describe("bucket.jobs", () => {
  it("Download file successful", async () => {
    bucket.queue.downloadJob.add({
      url:
        "https://archive.ics.uci.edu/ml/machine-learning-databases/00366/AReM.zip",
      bid: "dummy-bucket-001",
      des: "/dataset.tgz" + Date.now(),
    });
  });
  it("Zip successful", async () => {
    let job = await bucket.queue.zip.add({
      dir: "./test/sim/client/demoFolder",
      output: "./test/sim/server/dummy-bucket-001/a.zip",
    });
    job.isCompleted().then(() => console.log("Completed"));
    console.log("Done");
  });
});
