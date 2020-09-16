const admin = require("firebase-admin");
const config = require("../config");

const authorization = async function (req, res, next) {
  const { authorization } = req.headers;
  const { dummy } = req.body;
  if (authorization === undefined) {
    if (dummy === undefined) {
      res.status(401).send({
        message: "Unauthorized",
      });
      return;
    }
    if (config.bypass) {
      req.user = { ...dummy };
      next();
      return;
    } else {
      res.status(401).send({
        message: "Unauthorized",
      });
      return;
    }
  }
  try {
    let decodedId = await admin.auth().verifyIdToken(authorization);
    req.user = decodedId;
    next();
  } catch (e) {
    res.status(401).send({
      message: "Invalid token",
    });
    return;
  }
};

module.exports = authorization;
