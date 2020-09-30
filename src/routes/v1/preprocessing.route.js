const router = require("express").Router();
const admin = require("firebase-admin");
const authorization = require("../../middleware/authorization");
const fs = require("fs");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const path = require("path");
const Config = require("../../config");
const xmlHelpers = require("../../misc/XmlHelpers");

router.use(authorization);

/**
 * @api {GET} /v1/prep/labelling/labelmap Get label map if it existed
 */
router.get("/labelling/labelmap", async (req, res) => {
  const { bid } = req.query;
  // outputDir: buckets/bid/{field}
  // return labels from pbtxt
  if (!DataValidation.allNotUndefined(bid)) {
    res.status(statusCode.NotFound).send({
      message: "Not Found",
    });
    return;
  }
  try {
    let bucketDoc = await admin
      .firestore()
      .collection("buckets")
      .doc(bid)
      .get();
    if (!bucketDoc.exists) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }

    res.status(statusCode.OK).send({
      pbtxt: bucketDoc.data()["pbtxt"],
      labels: bucketDoc.data()["labels"],
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> labelmap: ", error);
  }
});

/**
 * @api {POST} /v1/prep/labelling/labelmap Define a label map
 */
router.post("/labelling/labelmap", async (req, res) => {
  const { bid, labels } = req.body; // The list of labels
  let pbtxt = "";
  if (!DataValidation.allNotUndefined(bid, labels)) {
    res.status(statusCode.NotFound).send({
      message: "Require bid, labels",
    });
    return;
  }
  if (!Array.isArray(labels)) {
    res.status(statusCode.BadRequest).send({
      message: "labels must be an array",
    });
    return;
  }
  try {
    for (let i = 0; i < labels.length; i++) {
      const { id, name } = labels[i];
      pbtxt += '{item {\n\tname:"' + name + '"\n\tid:' + id + "\n}}\n";
    }
    await admin
      .firestore()
      .collection("buckets")
      .doc(bid)
      .set({ pbtxt: pbtxt, labels: labels }, { merge: true });
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("POST -> labelmap: ", error);
  }
});

/**
 * @api {GET} /v1/prep/labelling/annotation Get annotation of a file
 */
router.get("/labelling/annotation", async (req, res) => {
  const { bid, folder, filename, outputDir } = req.query;
  const pathFile = path.join(Config.bucketSite, bid, outputDir);
  if (!DataValidation.allNotUndefined(bid, folder, filename, outputDir)) {
    res.status(statusCode.NotFound).send({
      message: "Require bid, folder, filename, outputDir",
    });
    return;
  }
  try {
    if (!fs.existsSync(pathFile)) {
      res.status(statusCode.OK).send({
        message: "File not found",
      });
      return;
    }
    let raw = fs.readFileSync(pathFile, { encoding: "utf8" });
    let rawObjects = xmlHelpers.getChildrenByTag(raw, "object");
    let data = [];
    for (let rawObject in rawObjects) {
      let obj = {
        label: xmlHelpers.getChildrenByTag(rawObject, "name")[0],
        xmax: parseInt(xmlHelpers.getChildrenByTag(rawObject, "xmax")[0]),
        xmin: parseInt(xmlHelpers.getChildrenByTag(rawObject, "xmin")[0]),
        ymax: parseInt(xmlHelpers.getChildrenByTag(rawObject, "ymax")[0]),
        ymin: parseInt(xmlHelpers.getChildrenByTag(rawObject, "ymin")[0]),
      };
      data.push(obj);
    }
    res.status(statusCode.OK).send({
      objects: data,
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> annotation: ", error);
  }
});

/**
 * @api {POST} /v1/prep/labelling/annotation Create an annotation file for a photo
 */
router.post("/labelling/annotation", async (req, res) => {
  const { bid, folder, filename, p, width, height, depth, objects } = req.body;
  // objects is an array of object
  let pathFile = path.join(Config.bucketSite, bid, p, folder);
  if (
    !DataValidation.allNotUndefined(
      bid,
      folder,
      filename,
      p,
      width,
      height,
      depth,
      objects
    )
  ) {
    res.status(statusCode.NotFound).send({
      message:
        "Require bid, folder, filename, p, width, height, depth and objects",
    });
    return;
  }
  if (!Array.isArray(objects)) {
    res.status(statusCode.BadRequest).send({
      message: "Objects must be an array",
    });
    return;
  }
  let rawObject = "";
  for (let i = 0; i < objects.length; i++) {
    const { name, bndbox } = objects[i]; // Name is the label
    // Make sure these fields existed
    // bndbox.xmin;
    // bndbox.ymin;
    // bndbox.xmax;
    // bndbox.ymax;
    if (!DataValidation.allNotUndefined(name, bndbox)) {
      res.status(statusCode.NotFound).send({
        message: "Invalid object",
      });
      return;
    }
    if (
      !DataValidation.allNotUndefined(
        bndbox.xmax,
        bndbox.xmin,
        bndbox.ymax,
        bndbox.ymin
      )
    ) {
      res.status(statusCode.NotFound).send({
        message: "Invalid bndbox",
      });
      return;
    }
    rawObject += `
        <object>
          <name>${name}</name>
          <truncated>0</truncated>
          <difficult>0</difficult>
          <occluded>0</occluded>
          <bndbox>
              <xmin>${bndbox.xmin}</xmin>
              <xmax>${bndbox.xmax}</xmax>
              <ymin>${bndbox.ymin}</ymin>
              <ymax>${bndbox.ymax}</ymax>
          </bndbox>
        </object>
    `;
  }
  let rawHeader = `
    <annotation>
      <folder>${folder}</folder>
      <filename>${filename}</filename>
      <path>${pathFile}</path>
      <size>
        <width>${width}</width>
        <height>${height}</height>
        <depth>${depth}</depth>
      </size>
  `;
  fs.writeFileSync(
    path.join(pathFile, filename + "_annotation.xml"),
    rawHeader + rawObject + "</annotation>"
  );
  res.status(statusCode.OK).send({
    message: "POST -> annotation is OK",
  });
  // Ref: https://medium.com/towards-artificial-intelligence/understanding-coco-and-pascal-voc-annotations-for-object-detection-bb8ffbbb36e3
  // write the annotation file by the structure defined in the link above
});

/**
 * @api {DELETE} /v1/prep/labelling/annotation Delete annotation of a file
 */
router.delete("/labelling/annotation", async (req, res) => {
  const { bid, p, folder, filename } = req.query;
  if (!DataValidation.allNotUndefined(bid, p, folder, filename)) {
    res.status(statusCode.NotFound).send({
      message: "Require bid, p, folder and filename",
    });
    return;
  }

  let pathFile = path.join(Config.bucketSite, bid, p, folder);
  try {
    fs.rmdirSync(pathFile);
    res.status(statusCode.OK).send({
      message: "Delete success",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("DELETE -> annotation: ", error);
  }
});

module.exports = router;
