const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../src/app");
const admin = require("firebase-admin");
const config = require("../../src/config");
const { assert, expect } = require("chai");
let should = chai.should();

chai.use(chaiHttp);

const requester = chai.request(server).keepOpen();
before(() => {
  config.bypass = true;
});

describe("v1/projects", function () {
  before(async function () {
    // Create dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").set({
      name: "Dummy project",
      description: "This is the description",
      ownerId: "12345",
    });
    console.log("Created dummy project");
  });

  it("GET", function (done) {
    requester
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
        assert.notEqual(projects.length, 0);
        console.log(projects);
        done();
      });
  });

  it("POST with error", function (done) {
    requester
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
        done();
      });
  });

  it("POST without error", function (done) {
    requester
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
        assert.equal(res.status, 201);
        done();
      });
  });

  it("PUT without error", function () {
    requester
      .put("/v1/projects")
      .set("content-type", "application/json")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
        pid: "dummy-0001",
        name: "Project XXX",
        description: "Description XXX",
      })
      .end(async function (err, res) {
        assert.equal(res.status, 200);
        let projectDoc = await admin
          .firestore()
          .collection("projects")
          .doc("dummy-0001")
          .get();
        let data = projectDoc.data();
        expect(data).to.has.property("name", "Project XXX");
      });
  });

  it("PUT with error", function () {
    requester
      .put("/v1/projects")
      .set("content-type", "application/json")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
        name: "Project XXX",
        description: "Description XXX",
      })
      .end((err, res) => {
        expect(res.status).to.equal(404);
      });
  });

  after(async function () {
    requester.close();
    // Delete dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").delete();
    await admin.firestore().collection("projects").doc("PROJECT-01").delete();
    console.log("Deleted dummy project\n");
  });
});
