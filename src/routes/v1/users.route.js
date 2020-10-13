const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const { firestore } = require("firebase-admin");
const similarity = require("similarity");
const StatusCode = require("../../misc/StatusCode");
router.use(authorization);

/*
@api {GET} /v1/users Get the user info
*/
router.get("/", async (req, res) => {
  let uid = req.user.uid;
  try {
    if (!DataValidation.allNotUndefined(uid)) {
      res.status(statusCode.NotFound).send({
        message: "[" + uid + "] Not Found",
      });
      return;
    }
    let getUser = await (await admin.firestore().collection("users").doc(uid).get()).data();
    res.status(statusCode.OK).send({
      user: getUser,
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> users ", error);
  }
});

/*
@api {POST} /v1/users Create new user profile
*/
router.post("/", async (req, res) => {
  let uid = req.user.uid;
  try {
    let checkExistedUser = await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .get();
    const userDetail = {
      email: req.user.email,
    };
    if (checkExistedUser.exists) {
      res.status(statusCode.NotAcceptable).send({
        message: "User is existed",
      });
      return;
    }
    await admin.firestore().collection("users").doc(uid).create(userDetail);
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
  }
});

/*
@api {GET} /v1/users/listing Search the users by their info
*/
router.get("/listing", async (req, res) => {
  const { keyword } = req.query;
  // console.log(keyword);
  try {
    if (!DataValidation.allNotUndefined(keyword)) {
      res.status(statusCode.NotFound).send({
        message: [],
      });
    }
    // let query = (await admin.auth().getUsers()).users;
    let query = (((await admin.auth().listUsers()).users));
    let result = [];
    for (let i = 0; i < query.length; i++) {
      let nameTokens = query[i].displayName.trim().split(' ');
      let index = Math.max(similarity(keyword, query[i].email, { sensitive: false }), similarity(keyword, query[i].displayName, { sensitive: false }));
      for (let nameToken of nameTokens) {
        index = Math.max(index, similarity(keyword, nameToken, { sensitive: false }));
      }
      if (index > 0.4) {
        result.push({
          si: index,
          uid: query[i].uid,
          email: query[i].email,
          displayName: query[i].displayName,
          photoURL: query[i].photoURL,
        });
      }
      // result.push({ email: query[i].email });
    }
    result = result.sort((a, b) => {
      if (a.si > b.si) {
        return -1;
      }
      if (b.si > a.si) {
        return 1;
      }
      return 0;
    })
    console.log(result);
    res.status(statusCode.OK).send({
      result: result,
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
  }
});

/**
 * @api {GET} /v1/users/info Get a user info
 */
router.get("/info", async (req, res) => {
  const { uid } = req.query;
  let info = await admin.auth().getUser(uid);
  res.status(StatusCode.OK).send(info);
});

module.exports = router;
