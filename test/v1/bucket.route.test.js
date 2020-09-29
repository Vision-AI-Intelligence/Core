const server = require("../../src/app");
const admin = require("firebase-admin");
const config = require("../../src/config");
const fs = require("fs");
const path = require("path");

const requester = require("supertest")(server);

describe("v1/bucket", function () {
  beforeAll(async () => {
    config.bypass = true;
    config.bucketTemp = "./test/sim/temp";
    config.bucketSite = "./test/sim/server";
    if (!fs.existsSync(path.join(config.bucketSite, "dummy-bucket-001"))) {
      fs.mkdirSync(path.join(config.bucketSite, "dummy-bucket-001"));
    }
    fs.copyFileSync(
      "./test/sim/materials/test01.txt",
      path.join(config.bucketSite, "dummy-bucket-001/test01.txt")
    );
    await admin
      .firestore()
      .collection("projects")
      .doc("dummy-project-001")
      .set({
        ownerId: "12345",
        buckets: ["dummy-bucket-001"],
      });
  });

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
  it("POST /v1/bucket/upload Sucessful", async function (done) {
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
        let existed = fs.existsSync(
          "./test/sim/server/dummy-bucket-001/test01.txt"
        );
        expect(existed).toBe(true);
        done();
      });
  });
  it("GET /v1/bucket/download Download file sucessful", async function () {
    requester
      .get(
        "/v1/bucket/download?dummyUid=12345&dummyEmail=teo@gmail.com&pid=dummy-project-001&bid=dummy-bucket-001&f=/dummy-bucket-001/test01.txt"
      )
      .end((err, res) => {
        console.log(res.header);
        expect(res.headers["content-length"]).not.toBe(0);
      });
  });
  afterEach(async function () {
    fs.rmdirSync(config.bucketTemp, { recursive: true });
    fs.rmdirSync(path.join(config.bucketSite, "dummy-bucket-001"), {
      recursive: true,
    });
    // Delete dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").delete();
    await admin
      .firestore()
      .collection("buckets")
      .doc("dummy-bucket-001")
      .delete();
  });
});
