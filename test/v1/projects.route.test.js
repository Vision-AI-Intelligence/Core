const server = require("../../src/app");
const admin = require("firebase-admin");
const config = require("../../src/config");

const requester = require("supertest")(server);
beforeAll(() => {
  config.bypass = true;
});

describe("v1/projects", function () {
  beforeEach(async function () {
    // Create dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").set({
      name: "Dummy project",
      description: "This is the description",
      ownerId: "12345",
    });
    console.log("Created dummy project");
  });

  it("GET", function () {
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
        expect(res.status).toBe(200);
        expect(projects.length).not.toBe(0);
        console.log(projects);
      });
  });

  it("POST with error", function () {
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
        expect(res.status).toBe(404);
      });
  });

  it("POST without error", function () {
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
        expect(res.status).toBe(201);
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
      .then(async function (res) {
        expect(res.status).toBe(200);
        let projectDoc = await admin
          .firestore()
          .collection("projects")
          .doc("dummy-0001")
          .get();
        let data = projectDoc.data();
        expect(data.name).toBe("Project XXX");
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
        expect(res.status).toBe(404);
      });
  });

  it("DELETE not existed project", function () {
    requester
      .delete("/v1/projects?pid=PROJECT-XXXXXXXXXX")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
      })
      .end((err, res) => {
        expect(res.status).toBe(404);
      });
  });

  it("DELETE existed project", function () {
    requester
      .delete("/v1/projects?pid=dummy-0001")
      .send({
        dummy: {
          uid: "12345",
          email: "Nguyen Van Teo",
        },
      })
      .end(async (err, res) => {
        let doc = await admin
          .firestore()
          .collection("projects")
          .doc("dummy-0001")
          .get();
        let d = doc.data();
        expect((await doc).exists).toBe(false);
      });
  });

  afterAll(async function () {
    // Delete dummy project
    await admin.firestore().collection("projects").doc("dummy-0001").delete();
    await admin.firestore().collection("projects").doc("PROJECT-01").delete();
    console.log("Deleted dummy project\n");
  });
});
