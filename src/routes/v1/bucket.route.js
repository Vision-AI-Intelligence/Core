const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const fs = require("fs");
const fse = require("fs-extra");
const bucketQueue = require("../../jobs/bucket.jobs");
const statusCode = require("../../misc/StatusCode");
const DataValidation = require("../../misc/DataValidation");
const Config = require("../../config");
const path = require("path");
const getFolderSize = require("get-folder-size");
const StatusCode = require("../../misc/StatusCode");
const multer = require("multer");

router.use(authorization);

const storage = multer.diskStorage({
  destination: (req, res, callback) => {
    callback(null, Config.bucketTemp);
  },
  filename: (req, file, callback) => {
    console.log(file.filename);
    callback(null, Date.now() + "-" + file.originalname);
  },
});
const uploadFile = multer({ storage: storage });

async function checkProjectPerm(res, pid, uid) {
  let projectDoc = admin.firestore().collection("projects").doc(pid);
  let projectData = (await projectDoc.get()).data();
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

async function calcBucketSize(res, pid, bid) {
  try {
    let result = await new Promise((resolve, reject) => {
      getFolderSize(path.join(Config.bucketSite, bid), (err, size) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(size);
      });
    });
    return result;
  } catch {
    return -1;
  }
}

/**
 * @api {GET} /v1/bucket/list Get the project's buckets
 * @apiParam  {String} pid Project's id
 * @apiSuccessExample {JSON} Success-Response:
 *      {
 *          buckets: ["BUCKET-001", "BUCKET-002", "BUCKET-003"]
 *      }
 */
router.get("/list", async (req, res) => {
  const { pid } = req.query;
  try {
    if (!DataValidation.allNotUndefined(pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    console.log(pid);
    let projectData = (await admin.firestore().collection('projects').doc(pid).get()).data();
    if (projectData.buckets === undefined || projectData.buckets.length == 0) {
      res.status(statusCode.NotFound).send({ message: 'Do not have any buckets!!!' });
      return;
    }
    res.status(statusCode.OK).send({
      buckets: projectData["buckets"],
    });
    return;
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> bucket/listing: ", error);
  }
});

/**
 * @api {GET} /v1/bucket/ Get files and folders list by its directory
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} d Current directory. Default is root /
 *
 * @apiSuccessExample {JSON} Success-Response:
 *    {
 *        files: [ "file1.png", "file2.jpeg", "file3.json",... ],
 *        folders: ["folder01", "folder02", "folder03",...]
 *    }
 */
router.get("/", async (req, res) => {
  const { pid, bid, d } = req.query;
  if (!DataValidation.allNotUndefined(pid, bid, d)) {
    res.status(statusCode.NotFound).send({
      message: "Require: pid, bid, d",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let bucketData = (
      await admin.firestore().collection("buckets").doc(bid).get()
    ).data();
    if (!bucketData["isPublic"]) {
      res.status(statusCode.NotFound).send({
        message: "Bucket [" + bid + "] is not public",
      });
      return;
    }
    let currentDir = path.join(Config.bucketSite, bid, d);
    let items = fs.readdirSync(currentDir);
    let files = items.filter((f) => fs.statSync(f).isFile());
    let folders = items.filter((f) => !files.includes(f));
    res.status(statusCode.OK).send({
      files: files,
      folders: folders,
    });
  } catch (error) {
    res
      .status(statusCode.InternalServerError)
      .send({ message: "Internal Server Error" });
    console.log("GET -> bucket /: ", error);
  }
});

/**
 * @api {GET} /v1/bucket/metadata Get file's metadata or folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} f File|directory name
 */
router.get("/metadata", async (req, res) => {
  const { pid, bid, f } = req.query;
  if (!DataValidation.allNotUndefined(pid, bid, f)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let bucketData = (
      await admin.firestore().collection("buckets").doc(bid).get()
    ).data();
    if (!bucketData["isPublic"]) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    let currentDir = path.join(Config.bucketSite, bid, f);
    let stat = fs.statSync(currentDir);
    res.status(statusCode.OK).send({
      stat: { ...stat },
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> bucket/metadata: ", error);
  }
});

router.get("/options", async (req, res) => {
  const { pid, bid } = req.query;
  if (!DataValidation.allNotUndefined(pid, bid)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let bucketData = (
      await admin.firestore().collection("buckets").doc(bid).get()
    ).data();
    if (!bucketData["isPublic"]) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }

    res.status(statusCode.OK).send({
      options: bucketData["options"],
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> bucket/options: ", error);
  }
});

router.post("/options", async (req, res) => {
  const { pid, bid, options } = req.body;
  if (!DataValidation.allNotUndefined(pid, bid, options)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    await admin.firestore().collection("buckets").doc(bid).set(
      {
        options: options,
      },
      { merge: true }
    );

    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("POST -> bucket/options: ", error);
  }
});

/**
 * @api {POST} /v1/bucket/upload Upload a file
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} d Current directory. Default is root /
 */
router.post("/upload", uploadFile.single("file"), async (req, res) => {
  const { pid, bid, d } = req.query;
  let uploadedFile = req.file;
  let currentDir = path.join(Config.bucketTemp, uploadedFile.filename);
  let destDir = path.join(Config.bucketSite, bid, d, uploadedFile.originalname);
  // Checksum is optional
  if (!DataValidation.allNotUndefined(pid, bid, d)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!fs.existsSync(currentDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    fse.moveSync(currentDir, destDir, { overwrite: false });
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("POST -> upload/file: ", error);
  }
});

/**
 * @api {PUT} /v1/bucket/mkdir Make new directory
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} dir Directory name
 * @apiParam  {String} d Current directory. Default is root /
 */
router.post("/mkdir", async (req, res) => {
  const { pid, bid, dir, d } = req.body;
  if (!DataValidation.allNotUndefined(pid, bid, dir, d)) {
    res.status(statusCode.NotFound).send({
      message: "Require: pid, bid, dir, d",
    });
    return;
  }
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    let currentDir = path.join(Config.bucketSite, bid, dir, d);
    fs.mkdirSync(currentDir);
    res.status(StatusCode.OK).send({
      message: "OK",
    });
  } catch (e) {
    res.status(StatusCode.InternalServerError).send({
      message: "Internal Server Error",
    });
  }
});

/**
 * @api {PUT} /v1/bucket/mv Move file or directory
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} src Source file|directory
 * @apiParam  {String} des Destination file|directory
 */
router.put("/mv", async (req, res) => {
  const { pid, bid, src, des } = req.body;
  let currentDir = path.join(Config.bucketSite, bid, src);
  let destDir = path.join(Config.bucketSite, bid, des);
  if (!DataValidation.allNotUndefined(pid, bid, dir, d)) {
    res.status(statusCode.NotFound).send({
      message: "Require: pid, bid, dir, d",
    });
    return;
  }
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    if (!fs.existsSync(currentDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    fse.moveSync(currentDir, destDir, { overwrite: false });
  } catch (e) {
    res.status(StatusCode.InternalServerError).send({
      message: "Internal Server Error",
    });
  }
});

/**
 * @api {PUT} /v1/bucket/cp Copy file or directory
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} src Source file|directory
 * @apiParam  {String} des Destination file|directory
 */
router.put("/cp", async (req, res) => {
  const { pid, bid, src, des } = req.body;
  let currentDir = path.join(Config.bucketSite, bid, src);
  let destDir = path.join(Config.bucketSite, bid, des);
  if (!DataValidation.allNotUndefined(pid, bid, dir, d)) {
    res.status(statusCode.NotFound).send({
      message: "Require: pid, bid, dir, d",
    });
    return;
  }
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    if (!fs.existsSync(currentDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    fse.copySync(currentDir, destDir, { recursive: true, overwrite: false });
  } catch (e) {
    res.status(StatusCode.InternalServerError).send({
      message: "Internal Server Error",
    });
  }
});

/**
 * @api {PUT} /v1/bucket/rm Remove a file or a folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} d File name or directory
 */
router.put("/rm", async (req, res) => {
  const { pid, bid, d } = req.body;
  let currentDir = path.join(Config.bucketSite, bid, d);
  if (!DataValidation.allNotUndefined(pid, bid, dir, d)) {
    res.status(statusCode.NotFound).send({
      message: "Require: pid, bid, dir, d",
    });
    return;
  }
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  try {
    if (!fs.existsSync(currentDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    fse.removeSync(currentDir);
  } catch (e) {
    res.status(StatusCode.InternalServerError).send({
      message: "Internal Server Error",
    });
  }
});

/**
 * @api {GET} /v1/bucket/download Download a file or a folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} f File|directory name
 */
router.get("/download", async (req, res) => {
  const { pid, bid, f } = req.query;
  let currentDir = path.join(Config.bucketTemp, bid, f);
  let destDir = path.join(Config.bucketSite, bid, f);
  if (!DataValidation.allNotUndefined(pid, bid, f)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!fs.existsSync(path.join(Config.bucketTemp, bid))) {
      fs.mkdirSync(path.join(Config.bucketTemp, bid));
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let bucketData = (
      await admin.firestore().collection("buckets").doc(bid).get()
    ).data();
    if (!bucketData["isPublic"]) {
      res.status(statusCode.NotFound).send({
        message: "Bucket [" + bid + "] is not public",
      });
      return;
    }
    if (!fs.existsSync(destDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    let stats = fs.statSync(destDir);
    if (stats.isFile()) {
      res
        .status(statusCode.Ok)
        .send({
          message: "OK",
        })
        .download(destDir, (err) => {
          res.status(statusCode.RequestTimeout).send({
            ...err,
          });
        });
    } else if (stats.isDirectory()) {
      let zipFolder = await bucketQueue.queue.zip.add({
        dir: destDir, // from server
        output: currentDir, // to client
      });
      let downloadCompleted = await zipFolder.isCompleted();
      if (downloadCompleted) {
        res
          .status(statusCode.OK)
          .send({
            message: "OK",
          })
          .download(currentDir, (err) => {
            res.status(statusCode.RequestTimeout).send({
              ...err,
            });
          });
        return;
      }
      throw new Error("Cannot download this folder");
    }
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
  }
});

// Zip, Unzip, Download-job are the worker jobs

/**
 * @api {GET} /v1/bucket/jobs Get the list of jobs
 * @apiParam  {String} pid Project's id
 * @apiSuccessExample {JSON} Success-Response:
 *    {
 *      "job-01": {
 *          "type": "unzip",
 *          "status": "200",
 *          "details": "...."
 *       },
 *      "job-02":{...},
 *      ...
 *    }
 */
router.get("/jobs", async (req, res) => {
  const { pid } = req.params;
  try {
    // check not null data
    if (!DataValidation.allNotUndefined(pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    // check ownerId
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }

    //get array buckets by pid
    let getBucketsId = (
      await admin.firestore().collection("projects").doc(pid).get("buckets")
    ).data();
    if (!getBucketsId.exists) {
      console.log("Nothing in buckets");
    }
    let data = [];
    for (let i = 0; i < getBucketsId.length; i++) {
      data.push(
        (
          await admin
            .firestore()
            .collection("buckets")
            .doc(getBucketsId[i])
            .collection("jobs")
            .get()
        ).docs.map((d) => {
          return d.data();
        })
      );
    }
    res.status(statusCode.OK).send({
      jobs: data,
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> bucket/jobs");
  }
});

/**
 * @api {PUT} /v1/bucket/zip Zip files and folders
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} src Source file|directory
 * @apiParam  {String} des Destination file|directory
 */
router.put("/zip", async (req, res) => {
  const { pid, bid, src, des } = req.body;
  let currentDir = path.join(Config.bucketSite, bid, src);
  let destDir = path.join(Config.bucketSite, bid, des);
  if (!DataValidation.allNotUndefined(pid, bid, src, des)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  if (!checkProjectPerm(res, pid, req.user.uid)) {
    return;
  }
  if (!fs.existsSync(currentDir)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  let job = await bucketQueue.queue.zip.add({
    dir: currentDir,
    output: destDir,
  });
  if (await job.isCompleted()) {
    res.status(statusCode.OK).send({
      result: job, // show zipped jobs to test on postman ahihi :))
    });
  }
});

/**
 * @api {PUT} /v1/bucket/unzip Unzip files and folders
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} src Source file|directory
 * @apiParam  {String} des Destination file|directory
 */
router.put("/unzip", async (req, res) => {
  const { pid, bid, src, des } = req.body;
  let currentDir = path.join(Config.bucketSite, bid, src);
  let destDir = path.join(Config.bucketSite, bid, des);
  if (!DataValidation.allNotUndefined(pid, bid, src, des)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    if (!fs.existsSync(currentDir)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    let unzipItems = await bucketQueue.queue.unzip.add({
      dir: currentDir,
      output: destDir,
    });
    if (await unzipItems.isCompleted()) {
      res.status(statusCode.OK).send({
        message: "OK",
      });
    }
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("PUT -> unzip: ", error);
  }
});

/**
 * @api {PUT} /v1/bucket/download-job Create a download job
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} url The url of the resource
 * @apiParam  {String} des Destination file|directory
 */
router.put("/download-job", async (req, res) => {
  const { pid, bid, url, des } = req.body;
  if (!DataValidation.allNotUndefined(pid, bid, url, des)) {
    res.status(statusCode.NotFound).send({
      message: "Require pid, bid, url, des",
    });
    return;
  }
  try {
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    bucketQueue.queue.downloadJob.add({ url: url, bid: bid, des: des });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("PUT -> download-job ", error);
  }
});

module.exports = router;
