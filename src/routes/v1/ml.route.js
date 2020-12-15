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

//router.use(checkProjectPerm);

const defaultRunnerEndpoint = `${config.defaultRunner.host}:${config.defaultRunner.port}`;

router.get("/models", async (req, res) => {
  const { pid } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  res.redirect(`${defaultRunnerEndpoint}/${pid}`, 302);
});

router.post("/gen_tfrecord", async (req, res) => {
  const { pid } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  job = await axios.default.post(
    `${defaultRunnerEndpoint}/ml/gen_tfrecord/${pid}`,
    req.body
  );
  if (job.status == 200) {
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("jobs")
      .doc(job.jobId)
      .set({ id: job.jobId });
    res.send({ message: "Generate TF Record" });
    return;
  }
  res.status(401).send({ message: "Generate TF Record error" });
});

router.post("/download_pretrained_model", async (req, res) => {
  const { pid } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  res.redirect(`${defaultRunnerEndpoint}/ml/download_pretrained_model/${pid}`);
});

module.exports = router;
