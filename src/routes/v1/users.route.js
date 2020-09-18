const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const { firestore } = require("firebase-admin");
const similarity = require("similarity");
router.use(authorization);

/*
@api {GET} /v1/users Get the user info
*/
router.get("/", (req, res) => {
    let uid = req.user.uid;
    try {
        if (DataValidation.allNotUndefined(uid)) {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            })
            return;
        }
        let getUser = admin.firestore().collection("users").doc(uid).get();
        res.status(statusCode.OK).send({
            user: getUser
        });
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
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
        let checkExistedUser = await admin.firestore().collection("users").doc(uid).get();
        const userDetail = {
            email: req.user.email,

        };
        if (checkExistedUser.exists) {
            res.status(statusCode.NotAcceptable).send({
                message: "User is existed"
            });
            return;
        }
        await admin.firestore().collection("users").doc(uid).create(userDetail);
        res.status(statusCode.OK).send({
            message: "OK"
        });
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("POST -> user: ", error);
    }
});

/*
@api {GET} /v1/users/listing Search the users by their info
*/
router.get("/listing", async (req, res) => {
    const { keyword } = req.body;
    const uid = req.user.uid;
    try {
        if (!DataValidation.allNotUndefined(keyword)) {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            })
        }

        let query = (await admin.firestore().collection("users").doc(uid).get()).data;
        let index = similarity(keyword, query, { sensitive: true });
        if (index < 6) {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
        }
        res.status(statusCode.OK).send({
            result: query
        });

    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("GET -> listing: ", error);
    }
});

module.exports = router;
