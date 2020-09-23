const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../src/app");
const admin = require("firebase-admin");
const config = require("../../src/config");
const { assert, expect } = require("chai");
const fs = require("fs");
const path = require("path");
let should = chai.should();

chai.use(chaiHttp);

const requester = chai.request(server).keepOpen();
before(() => {
  config.bypass = true;
  config.bucketTemp = "./test/sim/temp";
  config.bucketSite = "./test/sim/server";
});

describe("/v1/bucket", () => {
  beforeEach(async function () {
    // Create dummy project
    await admin
      .firestore()
      .collection("projects")
      .doc("dummy-0001")
      .set({
        name: "Dummy project",
        description: "This is the description",
        ownerId: "12345",
        buckets: ["dummy-bucket-001"],
      });
    await admin.firestore().collection("buckets").doc("dummy-bucket-001").set({
      bid: "dummy-bucket-001",
      size: 9999999,
      remain: 999999,
    });
    console.log("Created dummy project");
  });
  it("POST /v1/bucket/upload Sucessful", async () => {
    requester
      .post(
        "/v1/bucket/upload?dummyUid=12345&dummyEmail=teo@gmail.com&pid=dummy-0001&bid=dummy-bucket-001&d=/"
      )
      .set("Content-Type", "application/x-www-form-urlencoded")
      .attach("file", "./test/sim/client/test01.txt")
      .end((err, res) => {
        if (err) {
          console.log(err);
        }
        assert.equal(
          fs.existsSync("./test/sim/server/dummy-bucket-001/test01.txt"),
          true
        );
      });
  });
  afterEach(async function () {
    fs.rmdirSync(config.bucketTemp, { recursive: true });
    fs.rmdirSync(path.join(config.bucketSite, "dummy-bucket-001"), {
      recursive: true,
    });
    requester.close();
    // Delete dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").delete();
    await admin
      .firestore()
      .collection("buckets")
      .doc("dummy-bucket-001")
      .delete();
  });
});
