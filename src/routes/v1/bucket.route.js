const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const fs = require("fs");

router.use(authorization);

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
});

/**
 * @api {GET} /v1/bucket/metadata Get file's metadata or folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} f File|directory name
 */
router.get("/metadata", async (req, res) => {
  const { pid, bid, f } = req.query;
});

/**
 * @api {POST} /v1/bucket/upload Upload a file
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} d Current directory. Default is root /
 */
router.post("/upload", async (req, res) => {
  const { pid, bid, d } = req.query;
  // Checksum is optional
});

/**
 * @api {PUT} /v1/bucket/mkdir Make new directory
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} dir Directory name
 * @apiParam  {String} d Current directory. Default is root /
 */
router.put("/mkdir", async (req, res) => {
  const { pid, bid, dir, d } = req.body;
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
});

/**
 * @api {PUT} /v1/bucket/rm Remove a file or a folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} d File name or directory
 */
router.put("/rm", async (req, res) => {
  const { pid, bid, d } = req.body;
});

/**
 * @api {GET} /v1/bucket/download Download a file or a folder
 * @apiParam  {String} pid Project's id
 * @apiParam  {String} bid Bucket's id
 * @apiParam  {String} f File|directory name
 */
router.get("/download", async (req, res) => {
  const { pid, bid, f } = req.query;
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
});

module.exports = router;
