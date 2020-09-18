const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../src/app");
const admin = require("firebase-admin");
const config = require("../../src/config");
const { assert } = require("chai");
let should = chai.should();

chai.use(chaiHttp);

before(() => {
  config.bypass = true;
});

describe("v1/projects", () => {
  beforeEach(async () => {
    // Create dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").set({
      name: "Dummy project",
      description: "This is the description",
      ownerId: "12345",
    });
    console.log("Created dummy project");
  });

  it("GET", async () => {
    chai
      .request(server)
      .get("/v1/projects")
      .set("content-type", "application/json")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
      })
      .end((err, res) => {
        const { projects } = res.body;
        res.should.has.status(200);
        assert.equal(projects.length, 1);
        console.log(projects);
      });
  });

  it("POST with error", async () => {
    chai
      .request(server)
      .post("/v1/projects")
      .set("content-type", "application/json")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
        name: "Project 01",
        description: "Description 01",
      })
      .end((err, res) => {
        res.should.has.status(404);
      });
  });

  it("POST without error", async () => {
    chai
      .request(server)
      .post("/v1/projects")
      .set("content-type", "application/json")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
        id: "PROJECT-01",
        name: "Project 01",
        description: "Description 01",
      })
      .end((err, res) => {
        res.should.has.status(200);
      });
  });

  it("");

  afterEach(async () => {
    // Delete dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").delete();
    await admin.firestore().collection("projects").doc("PROJECT-01").delete();
    console.log("Deleted dummy project");
  });
});
