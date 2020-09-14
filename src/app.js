const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const cors = require("cors");
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("../key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://vision-ai-intelligence.firebaseio.com",
});

app.use(bodyParser.json());
app.use(cors());
app.use(require("./middleware/logger"));

// Routes assignment zone
app.use("/v1/projects", require("./routes/v1/projects.route"));
// End of routes assignement zone

app.listen(config.port, config.host, () => {
  console.log("Server is runnning");
});
