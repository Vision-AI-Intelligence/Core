const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const cors = require("cors");
const app = express();
const { UI } = require("bull-board");

var admin = require("firebase-admin");

var serviceAccount = require("../key.json");

function init() {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://vision-ai-intelligence.firebaseio.com",
  });

  app.use(bodyParser.json());
  app.use(cors());
  app.use(require("./middleware/logger"));

  // Routes assignment zone
  app.use("/v1/users", require("./routes/v1/users.route"));
  app.use("/v1/projects", require("./routes/v1/projects.route"));
  app.use("/v1/bucket", require("./routes/v1/bucket.route"));
  app.use("/v1/prep", require("./routes/v1/preprocessing.route"));
  app.use("/v1/jobs", require("./routes/v1/job.route"));
  app.use("/v1/ml", require("./routes/v1/ml.route"));
  app.use("/v1/dashboard/jobs", UI);
  // End of routes assignement zone
}

init();

module.exports = app;
