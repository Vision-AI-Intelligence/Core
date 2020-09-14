const fs = require("fs");
const config = require("../config");

const logger = function (req, res, next) {
  if (this.cache === undefined) {
    this.cache = {
      stream: new fs.WriteStream(config.log),
    };
  }
  let stream = this.cache.stream;
  let log = Date.now() + " - " + req.method + " - " + req.baseUrl + "\n";
  stream.write(log);
  console.log(log);
  next();
};

module.exports = logger;
