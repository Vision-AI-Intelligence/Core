const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation")
const statusCode = require("../../misc/StatusCode");
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
    // if (id === undefined) {
    //     res.status(404).send({
    //         message: "Id is required",
    //     });
    //     return;
    // }
    // if (name === undefined) {
    //     res.status(404).send({
    //         message: "Name is required"
    //     });
    //     return;
    // }
    try {
        if (DataValidation.allNotUndefined(id, name)) {
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
            } else {
                // Save the project to firestore
                admin.firestore().collection("projects").doc(id).set({
                    id: id,
                    name: name,
                    description: description,
                    ownerId: req.user.uid
                }).then(
                    res.status(statusCode.Created).send({
                        message: "OK",
                    })
                ).catch((err) => {
                    console.error("POST -> projects: ", err);
                    res.status(statusCode.BadRequest).send({
                        message: "Bad request"
                    });
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
        console.log("POST -> projects ", error);
    }



});

/*
@api {PUT} /v1/projects Update the project
*/
router.put("/", (req, res) => {
    const { pid, name, description } = req.body;
    // Update only name and description
    // if (pid === undefined) {
    //     res.status(404).send({
    //         message: "Id is required"
    //     });
    //     return;
    // }
    // if (name === undefined) {
    //     res.status(404).send({
    //         message: "Name is required"
    //     });
    //     return;
    // }
    // if (description === undefined) {
    //     res.status(404).send({
    //         message: "Description is required"
    //     });
    //     return;
    // }
    try {
        // let checkPid = await admin.firestore()
        //     .collection("projects").id;
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
router.delete("/", (req, res) => {
    const { pid } = req.query;
    // if (pid === undefined) {
    //     res.status(404).send({
    //         message: "Id is required"
    //     });
    //     return;
    // }
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
router.post("/invite", (req, res) => {
    const { pid, from, to } = req.query;
    // to: not null, the collaborator's id'
    // if(pid === undefined || to === undefined){
    //     res.status(404).send({
    //         message: " is required"
    //     });
    // }
    // pid === undefined || to === undefined ? res.status(404).send({
    //     message: "Id is required"
    // }) : res.status(404).send({
    //     message: "Collaboration's id is required"
    // })
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
router.delete("/invite", (req, res) => {
    const { pid, invitationId } = req.query;
    try {
        if (DataValidation.allNotUndefined(invitationId)) {
            await admin.firestore().collection("projects").doc(pid).collection("invitation").doc(invitationId).delete();
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
router.post("/invite/accept", (req, res) => {
    const { pid, invitationId } = req.query;
    // Get the invitation data from its id

    // Remember to put the collaborator data into collaborator collection

    try {
        if (DataValidation.allNotUndefined(invitationId)) {
            let getInvitation = await admin.firestore().collection("projects").doc(pid).collection("invitation").doc(invitationId).get();
            if (getInvitation.exists) {
                await admin.firestore().collection("projects").doc(pid).collection("invitaion").doc(invitationId).delete();
                // how to update collaborator's uid
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
router.get("/collaborators", (req, res) => { });

/*
@api {DELETE} /v1/projects/collaborators Remove a collaborator
*/
router.delete("/collaborators", (req, res) => { });

module.exports = router;
