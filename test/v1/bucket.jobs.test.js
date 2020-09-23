const chai = require("chai");
const chaiHttp = require("chai-http");
const bucket = require("../../src/jobs/bucket.jobs");

describe("bucket.jobs", () => {
  it("Download file successful", async () => {
    bucket.queue.downloadJob.add({
      url: "https://www.robots.ox.ac.uk/~vgg/data/flowers/102/102flowers.tgz",
      bid: "dummy-bucket-001",
      des: "/flowers.tgz" + Date.now(),
    });
  });
});
