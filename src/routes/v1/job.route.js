const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const similarity = require("similarity");
const StatusCode = require("../../misc/StatusCode");
const config = require("../../config");
const FieldValue = admin.firestore.FieldValue;
const axios = require("axios");

router.use(authorization);

async function checkProjectPerm(res, pid, uid) {
  let projectDoc = admin.firestore().collection("projects").doc(pid);
  let projectData = (await projectDoc.get()).data();
  if (projectData === undefined) {
    return false;
  }
  if (projectData["ownerId"] != uid) {
    if (!projectData["collaborators"].includes(uid)) {
      res.status(statusCode.Forbidden).send({
        message: "Accessing to project [" + pid + "] does not allow",
      });
      return false;
    }
  }
  return true;
}

router.use(checkProjectPerm);

router.get("/", async (req, res) => {
  const { pid } = req.query;
  let jobs = (
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("jobs")
      .get()
  ).docs;
  res.status(200).send({
    jobs: jobs.map((job) => job.data()),
  });
});

router.post("/revoke", async (req, res) => {
  const { jobId } = req.query;
  let response = await axios.default.post(
    `${config.defaultRunner.host}:${config.defaultRunner.port}/jobs/revoke/${jobId}`
  );
  res.status(response.status).send({
    ...response.data,
  });
});

router.delete("/", async (req, res) => {
  const { pid, jobId } = req.query;
  await axios.default.post(
    `${config.defaultRunner.host}:${config.defaultRunner.port}/jobs/revoke/${jobId}`
  );
  await admin
    .firestore()
    .collection("projects")
    .doc(pid)
    .collection("jobs")
    .doc(jobId)
    .delete();
  res.status(200).send({
    message: `Deleted ${jobId}`,
  });
});

module.exports = router;
