const admin = require("firebase-admin");
const config = require("../config");
const statusCode = require("../misc/StatusCode");
const authorization = async function (req, res, next) {
  const { authorization } = req.headers;
  let { dummy } = req.body;
  if (authorization === undefined) {
    if (dummy === undefined) {
      const { dummyUid, dummyEmail } = req.query;
      if (dummyUid === undefined || dummyEmail === undefined) {
        res.status(statusCode.Unauthorized).send({
          message: "Unauthorized",
        });
        return;
      }
      dummy = {
        uid: dummyUid,
        email: dummyEmail,
      };
    }
    if (config.bypass) {
      req.user = { ...dummy };
      next();
      return;
    } else {
      res.status(statusCode.Unauthorized).send({
        message: "Unauthorized",
      });
      return;
    }
  }
  try {
    let decodedId = await admin.auth().verifyIdToken(authorization);
    req.user = { ...decodedId };
    next();
  } catch (e) {
    res.status(statusCode.Unauthorized).send({
      message: "Invalid token",
    });
    return;
  }
};

module.exports = authorization;
