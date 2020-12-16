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
const RedisApp = require("../../redis_app");

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
  const { jobId } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  let data = await new Promise((resolve, reject) => {
    RedisApp.app.HGETALL(jobId, (err, reply) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(reply);
    });
  });

  res.status(200).send({
    state: data,
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
  const { pid, jobId, type } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  await axios.default.post(
    `${config.defaultRunner.host}:${config.defaultRunner.port}/jobs/revoke/${jobId}`
  );
  await admin
    .firestore()
    .collection("projects")
    .doc(pid)
    .collection(`jobs-${type}`)
    .doc(jobId)
    .delete();
  res.status(200).send({
    message: `Deleted ${jobId}`,
  });
});

module.exports = router;
