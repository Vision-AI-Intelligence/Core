const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");

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
        res.status(200).send({
            projects: projects,
        });
    } catch (e) {
        res.status(500).send({
            ...e,
        });
    }
});

/*
@api {POST} /v1/projects Create new project
 */
router.post("/", async (req, res) => {
    const { id, name, description } = req.body;

    // name: not null
    // ownerId: not null

    // Check the id
    // id: not null, unique, human-friendly
    if (id === undefined) {
        res.status(404).send({
            message: "Id is required",
        });
        return;
    }
    if (name === undefined) {
        res.status(404).send({
            message: "Name is required"
        });
        return;
    }
    try {
        let existedProjectDoc = await admin
            .firestore()
            .collection("projects")
            .where("id", "==", id)
            .get();
        if (existedProjectDoc.docs.length != 0) {
            res.status(404).send({
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
                res.status(201).send({
                    message: "OK",
                })
            ).catch((err) => {
                console.error("Hello, somethings wrong here: ", err);
                res.status(400).send({
                    message: "Bad request"
                });
            });
        }
    } catch (error) {
        console.log("create wrong ", error);
    }



});

/*
@api {PUT} /v1/projects Update the project
*/
router.put("/", (req, res) => {
    const { pid, name, description } = req.body;
    // Update only name and description
    if (pid === undefined) {
        res.status(404).send({
            message: "Id is required"
        });
        return;
    }
    if (name === undefined) {
        res.status(404).send({
            message: "Name is required"
        });
        return;
    }
    if (description === undefined) {
        res.status(404).send({
            message: "Description is required"
        });
        return;
    }
    try {
        // let checkPid = await admin.firestore()
        //     .collection("projects").id; 
        let checkExistedProject = await admin.firestore().collection("projects").doc(pid).get();
        if (checkExistedProject.exists) {
            admin.firestore().collection("projects").doc(pid).update({
                name: name,
                description: description
            }).then(
                res.status(200).send({
                    message: "Update OK"
                })
            ).catch((err) => {
                console.error("Somethings wrong: ", err);
                res.status(404).send({
                    message: "Not Found"
                });
            });
        } else {
            res.status(404).send({
                message: "Project [" + pid + "] is not founded"
            });
            return;
        }
    } catch (error) {
        console.log("Update failed ", error);
    }
});

/*
@api {DELETE} /v1/projects Delet the project
*/
router.delete("/", (req, res) => {
    const { pid } = req.query;
    if (pid === undefined) {
        res.status(404).send({
            message: "Id is required"
        });
        return;
    }
    try {
        let checkPid = await admin.firestore().collection("projects").id.toString();
        if (checkPid === pid) {
            admin.firestore().collection("projects").doc(pid).delete().then(
                res.status(200).send({
                    message: "Delete OK"
                })
            ).catch((error) => {
                console.log("Delete error ", error);
                res.status(400).send({
                    message: "Bad request"
                });
            });
        } else {
            res.send(401).send({
                message: "Unauthorized"
            });
        }
    } catch (error) {
        console.log("Delete failed ", error);
    }
});

/*
@api {POST} /v1/projects/invite Create the invitation
*/
router.post("/invite", (req, res) => {
    const { pid, to } = req.query;
    // to: not null, the collaborator's id'
    // if(pid === undefined || to === undefined){
    //     res.status(404).send({
    //         message: " is required"
    //     });
    // }
    pid === undefined || to === undefined ? res.status(404).send({
        message: "Id is required"
    }) : res.status(404).send({
        message: "Collaboration's id is required"
    })
    try {

    } catch (err) {
        console.log(err);
    }
});

/*
@api {DELETE} /v1/projects/invite Delete the invitation
*/
router.delete("/invite", (req, res) => {
    const { invitationId } = req.query;
});

/*
@api {POST} /v1/projects/invite/accept Accept the invitation
*/
router.post("/invite/accept", (req, res) => {
    const { invitationId } = req.query;
    // Get the invitation data from its id

    // Remember to put the collaborator data into collaborator collection
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
