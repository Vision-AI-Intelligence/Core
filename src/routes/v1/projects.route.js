const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation")
const statusCode = require("../../misc/StatusCode");
const FieldValue = admin.firestore.FieldValue;
router.use(authorization);

/*
@apiName GET 
@apiDescription Get existed projects of the user
@apiVersion  1.0.0
*/
router.get("/", async (req, res) => {
    try {
        let projectDoc = await admin
            .firestore()
            .collection("projects")
            .where("ownerId", "==", req.user.uid)
            .get();
        let projects = projectDoc.docs.map((doc) => doc.data());
        res.status(statusCode.OK).send({
            projects: projects,
        });
    } catch (e) {
        res.status(statusCode.InternalServerError).send({
            ...e,
        });
    }
});

/*
@api {POST} /v1/projects Create new project
 */
router.post("/", async (req, res) => {
    const { id, name, description } = req.body;
    try {

        if (!DataValidation.allNotUndefined(id, name)) {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }
        let existedProjectDoc = await admin
            .firestore()
            .collection("projects")
            .where("id", "==", id)
            .get();
        if (existedProjectDoc.docs.length != 0) {
            res.status(statusCode.NotFound).send({
                message: "Id [" + id + "] already existed",
            });
            return;
        }
        // Save the project to firestore
        await admin.firestore().collection("projects").doc(id).create({
            id: id,
            name: name,
            description: description,
            ownerId: req.user.uid
        });
        res.status(statusCode.Created).send({
            message: "OK",
        });
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("POST -> projects ", error);
    }

});

/*
@api {PUT} /v1/projects Update the project
*/
router.put("/", async (req, res) => {
    const { pid, name, description } = req.body;

    try {
        if (DataValidation.allNotUndefined(pid, name, description)) {
            let checkExistedProject = admin.firestore().collection("projects").doc(pid).get();
            if (checkExistedProject.exists) {
                admin.firestore().collection("projects").doc(pid).update({
                    name: name,
                    description: description
                }).then(
                    res.status(statusCode.OK).send({
                        message: "Update OK"
                    })
                ).catch((err) => {
                    console.error("PUT -> projects: ", err);
                    res.status(statusCode.BadRequest).send({
                        message: "Bad Request"
                    });
                });
            } else {
                res.status(statusCode.NotFound).send({
                    message: "Project [" + pid + "] is not founded"
                });
                return;
            }
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }

    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("PUT -> projects: ", error);
    }
});

/*
@api {DELETE} /v1/projects Delet the project
*/
router.delete("/", async (req, res) => {
    const { pid } = req.query;
    try {
        if (DataValidation.allNotUndefined(pid)) {
            let checkPid = await admin.firestore().collection("projects").doc(pid).get();
            if (checkPid.exists) {
                admin.firestore().collection("projects").doc(pid).delete().then(
                    res.status(statusCode.OK).send({
                        message: "Delete OK"
                    })
                ).catch((error) => {
                    console.log("DELETE -> projects: ", error);
                    res.status(statusCode.BadRequest).send({
                        message: "Bad request"
                    });
                });
            } else {
                res.send(statusCode.NotFound).send({
                    message: "[" + pid + "] Not Found"
                });
            }
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }

    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("DELETE -> projects: ", error);
    }
});

/*
@api {POST} /v1/projects/invite Create the invitation
*/
router.post("/invite", async (req, res) => {
    const { pid, from, to } = req.query;
    try {
        if (DataValidation.allNotUndefined(pid, from, to)) {
            const message = {
                from: from,
                to: to,
                time: Date.now().toString(),
                project: pid
            }
            await admin.firestore().collection("projects").doc(pid).collection("invitation").doc().create(message);
            // send invitation to collaborator
            await admin.firestore().collection("users").doc(to).collection("invitation").doc().create(message);

            res.status(statusCode.OK).send({
                message: "OK"
            });
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }
    } catch (err) {
        res.status(statusCode.InternalServerError).send({
            ...err
        });
        console.log("POST -> invite: ", err);
    }
});

/*
@api {DELETE} /v1/projects/invite Delete the invitation
*/
router.delete("/invite", async (req, res) => {
    const { pid, invitationId } = req.query;
    try {
        if (DataValidation.allNotUndefined(invitationId)) {
            await admin.firestore().collection("projects").doc(pid).collection("invitation").doc(invitationId).delete();
            // delete invitation of collaborator
            await admin.firestore().collection("users").doc(req.user.uid).collection("invitation").doc(invitationId).delete();
            res.status(statusCode.OK).send({
                message: "OK"
            });
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("DELETE -> invitation: ", error);
    }
});

/*
@api {POST} /v1/projects/invite/accept Accept the invitation
*/
router.post("/invite/accept", async (req, res) => {
    const { pid, invitationId } = req.query;
    // Get the invitation data from its id

    // Remember to put the collaborator data into collaborator collection

    try {
        if (DataValidation.allNotUndefined(invitationId)) {
            let getInvitation = await admin.firestore().collection("projects").doc(pid).collection("invitation").doc(invitationId).get();
            let uid = req.user.uid;
            if (getInvitation.exists) {
                // delete the invitation in project
                await admin.firestore().collection("projects").doc(pid).collection("invitaion").doc(invitationId).delete();
                // delete the invitation of user
                await admin.firestore().collection("users").doc(uid).collection("invitation").doc(invitationId).delete();
                await admin.firestore().collection("projects").doc(pid).update({
                    collaborators: FieldValue.arrayUnion(uid)
                });
                await admin.firestore().collection("users").doc(uid).update({
                    collaborated: FieldValue.arrayUnion(pid)
                })
                res.status(statusCode.OK).send({
                    message: "OK"
                });
            }
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("POST -> invitation/accept: ", error);
    }
});

/*
@api {GET} /v1/projects/collaborators Get the list of collaborators
*/
router.get("/collaborators", async (req, res) => {
    const { pid } = req.body;
    try {
        if (DataValidation.allNotUndefined(pid)) {
            let getCollaborators = await admin.firestore().collection("projects").doc(pid).get("collaborators");
            res.status(statusCode.OK).send({
                collaborators: getCollaborators
            });
        } else {
            res.status(statusCode.NotFound).send({
                message: "Not Found"
            });
            return;
        }
    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("GET -> collaborators: ", error);
    }
});

/*
@api {DELETE} /v1/projects/collaborators Remove a collaborator
*/
router.delete("/collaborators", async (req, res) => {
    const { pid } = req.body;
    let uid = req.user.uid;
    try {
        if (DataValidation.allNotUndefined(pid)) {
            await admin.firestore().collection("projects").doc(pid).update({
                collaborators: FieldValue.arrayUnion(uid)
            });
            res.status(statusCode.OK).send({
                message: "OK"
            });
        }

    } catch (error) {
        res.status(statusCode.InternalServerError).send({
            ...error
        });
        console.log("DELETE -> collaborators: ", error);
    }
});

module.exports = router;
