const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const { firestore } = require("firebase-admin");
router.use(authorization);

/*
@api {GET} /v1/users Get the user info
*/
router.get("/", (req, res) => {
    let uid = req.user.uid;
    try {
        if (DataValidation.allNotUndefined(uid)) {
            let getUser = admin.firestore().collection("users").doc(uid).get();
            res.status(statusCode.OK).send({
                user: getUser
            });
        } else {
            res.status(statusCode.NotAcceptable).send({
                message: "Not Acceptable"
            })
            return;
        }
    } catch (error) {
        console.log("GET -> users ", error);
    }

});

/*
@api {POST} /v1/users Create new user profile
*/
router.post("/", (req, res) => { });

/*
@api {GET} /v1/users/listing Search the users by their info
*/
router.get("/listing", (req, res) => { });

module.exports = router;
