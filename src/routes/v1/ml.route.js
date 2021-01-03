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
const { pathExists } = require("fs-extra");

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

// router.get("/models", async (req, res) => {
//   const { pid } = req.query;
//   if (!checkProjectPerm(res, pid, req.user.uid)) {
//     return;
//   }
//   res.redirect(`${defaultRunnerEndpoint}/${pid}`, 302);
// });

router.post("/gen_tfrecord", async (req, res) => {
  const { pid } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    job = await axios.default.post(
      `${defaultRunnerEndpoint}/ml/gen_tfrecord/${pid}`,
      req.body
    );
    if (job.status == 200) {
      await admin
        .firestore()
        .collection("projects")
        .doc(pid)
        .collection("jobs-ml")
        .doc(job.data.jobId)
        .set({ id: job.data.jobId });
      res.send({ message: "Generate TF Record" });
      return;
    }
    res.status(401).send({ message: "Generate TF Record error" });
  } catch (err) {
    console.log(err);
    res.status(401).send({ message: err.message });
  }
});

router.post("/download_pretrained_model", async (req, res) => {
  const { pid } = req.query;
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    console.log(req.body);
    let response = await axios.default.post(
      `${defaultRunnerEndpoint}/ml/download_pretrained_model/${pid}`,
      req.body
    );
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("jobs-ml")
      .doc(response.data.jobId)
      .set({
        id: response.data.jobId,
        model_name: req.body.name,
        type: "download-model",
      });
    res.status(response.status).send({ data: response.data });
  } catch (err) {
    res.status(401).send({ message: err.message });
  }
});

router.get("/models", async (req, res) => {
  const { pid } = req.query;
  res.redirect(302, `${defaultRunnerEndpoint}/ml/models/${pid}`);
});
router.get("/models/trains", async (req, res) => {
  const { pid, model } = req.query;
  res.redirect(302, `${defaultRunnerEndpoint}/ml/train/${pid}/${model}`);
});

router.post("/models/trains", async (req, res) => {
  const { pid, model, train } = req.query;
  res.redirect(
    307,
    `${defaultRunnerEndpoint}/ml/train/${pid}/${model}/${train}`
  );
});

router.get("/models/config", async (req, res) => {
  const { pid, model } = req.query;
  res.redirect(302, `${defaultRunnerEndpoint}/ml/pipeline/${pid}/${model}`);
});

router.post("/models/config", async (req, res) => {
  const { pid, model, train } = req.query;
  const { config } = req.body;
  try {
    let response = await axios.default.post(
      `${defaultRunnerEndpoint}/ml/pipeline/${pid}/${model}/${train}`,
      { config: config }
    );
    res.status(200).send({ message: "Saved" });
  } catch (err) {
    res.status(403).send({ message: err.error.message });
  }
});

router.post("/models/start-train", async (req, res) => {
  const { pid, model, train } = req.query;
  try {
    let response = await axios.default.post(
      `${defaultRunnerEndpoint}/ml/start-train/${pid}/${model}/${train}`,
      {}
    );
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("models")
      .doc(model)
      .collection("trains")
      .doc(train)
      .set({
        id: response.data.jobId,
        start_at: Date.now(),
      });
    res.send({ data: response.data });
  } catch (err) {
    res.status(403).send({ message: err.error.message });
  }
});

router.delete("/models/train", async (req, res) => {
  const { pid, model, train } = req.query;
  try {
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("models")
      .doc(model)
      .collection("trains")
      .doc(train)
      .delete();
    res.send({ message: "Deleted" });
  } catch (err) {
    res.status(403).send({ message: err.error.message });
  }
});

router.post("/models/infer", async (req, res) => {
  const { pid, model, train } = req.query;
  try {
    res.redirect(
      307,
      `${defaultRunnerEndpoint}/ml/infer/${pid}/${model}/${train}`
    );
  } catch (err) {
    res.status(403).send({ message: err.error.message });
  }
});

module.exports = router;
