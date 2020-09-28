const router = require("express").Router();
const admin = require("firebase-admin");
const authorization = require("../../middleware/authorization");
const fs = require("fs");

router.use(authorization);

/**
 * @api {GET} /v1/prep/labelling/labelmap Get label map if it existed
 */
router.get("/labelling/labelmap", async (req, res) => {});

/**
 * @api {POST} /v1/prep/labelling/labelmap Define a label map
 */
router.post("/labelling/labelmap", async (req, res) => {
  const { labels } = req.body; // The list of labels

  for (let i = 0; i < labels.length; i++) {
    const { id, name } = labels[i];
  }
});

/**
 * @api {GET} /v1/prep/labelling/annotation Get annotation of a file
 */
router.get("/labelling/annotation", async (req, res) => {
  const { bid, folder, filename } = req.query;
});

/**
 * @api {POST} /v1/prep/labelling/annotation Create an annotation file for a photo
 */
router.post("/labelling/annotation", async (req, res) => {
  const {
    bid,
    folder,
    filename,
    path,
    width,
    height,
    depth,
    objects,
  } = req.body;

  // objects is an array of object

  for (let i = 0; i < objects.length; i++) {
    const { name, bndbox } = objects[i]; // Name is the label
    // Make sure these fields existed
    // bndbox.xmin;
    // bndbox.ymin;
    // bndbox.xmax;
    // bndbox.ymax;
  }
});

/**
 * Get the labelling tool options
 */
router.get("/labelling/options", async (req, res) => {});

/**
 * @api {POST} /v1/prep/labeling/options Set options for labelling tool
 */
router.post("/labelling/options", async (req, res) => {
  const { options } = req.body;
});

module.exports = router;
