const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");

router.use(authorization);

/*
@api {GET} /v1/users Get the user info
*/
router.get("/", (req, res) => {});

/*
@api {POST} /v1/users Create new user profile
*/
router.post("/", (req, res) => {});

/*
@api {GET} /v1/users/listing Search the users by their info
*/
router.get("/listing", (req, res) => {});

module.exports = router;
