const router = require("express").Router();
const authorization = require("../../middleware/authorization");
const admin = require("firebase-admin");
const DataValidation = require("../../misc/DataValidation");
const statusCode = require("../../misc/StatusCode");
const similarity = require("similarity");
const StatusCode = require("../../misc/StatusCode");
const FieldValue = admin.firestore.FieldValue;
router.use(authorization);


async function checkProjectPerm(res, pid, uid) {
  let projectDoc = admin.firestore().collection("projects").doc(pid);
  let projectData = (await projectDoc.get()).data();
  if (projectData === undefined) {
    return false;
  }
  if (projectData["ownerId"] != uid) {
    if (!projectData["collaborators"].includes(uid)) {
      res.status(statusCode.Forbidden).send({
        message: "Accessing to project [" + pid + "] does not allow",
      });
      return false;
    }
  }
  return true;
}


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
@apiName GET 
@apiDescription Get accepted projects of the user
@apiVersion  1.0.0
*/
router.get("/accept", async (req, res) => {
  try {
    let projectCollaborated = await (await admin.firestore().collection("users").doc(req.user.uid).get()).data()["collaborated"];
    let projects = [];
    if (projectCollaborated == undefined || projectCollaborated.length == 0 || projectCollaborated == null) {
      res.status(statusCode.NotFound).send({
        message: "Do not have any projects here!!!"
      });
      return;
    }
    for (const i of projectCollaborated) {
      let projectDoc = (await admin.firestore().collection("projects").doc(i).get()).data();
      projects.push({
        id: projectDoc.id,
        name: projectDoc.name,
        description: projectDoc.description,
        ownerId: projectDoc.ownerId
      });
    }
    // console.log(projectCollaborated);
    res.status(statusCode.OK).send({
      projects: projects,
    });
    return;
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
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, id, req.user.uid)) {
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
      ownerId: req.user.uid,
    });
    res.status(statusCode.Created).send({
      message: "OK",
    });
    return;
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
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
    if (!DataValidation.allNotUndefined(pid, name, description)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let checkExistedProject = await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .get();
    if (!checkExistedProject.exists) {
      res.status(statusCode.NotFound).send({
        message: "Project [" + pid + "] is not founded",
      });
      return;
    }
    await admin.firestore().collection("projects").doc(pid).update({
      name: name,
      description: description,
    });
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("PUT -> projects: ", error);
  }
});

/*
@api {DELETE} /v1/projects Delete the project
*/
router.delete("/", async (req, res) => {
  const { pid } = req.query;
  try {
    if (!DataValidation.allNotUndefined(pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let checkPid = await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .get();
    if (!checkPid.exists) {
      res.status(statusCode.NotFound).send({
        message: "[" + pid + "] Not Found",
      });
      return;
    }
    if (!(req.user.uid == checkPid.data()["ownerId"])) {
      res.status(statusCode.Unauthorized).send({
        message: "Unauthorized",
      });
      return;
    }
    // check exist of invitation
    let invitationSnapshot = await admin.firestore().collection("projects").doc(pid).collection("invitation").get();
    let iId = [];

    // if not empty => delete document in this user's invitation then delete all document in project's invitation
    if (!invitationSnapshot.empty) {
      invitationSnapshot.docs.map((document) => {
        iId.push({
          id: document.data().id,
          to: document.data().to
        });
      });
      for (const i of iId) {
        await admin.firestore().collection("users").doc(i.to).collection("invitation").doc(i.id).delete();
      }
      invitationSnapshot.docs.forEach(async doc => await doc.ref.delete()); // delete all document in invitation
      await admin.firestore().collection("projects").doc(pid).delete();
      res.status(statusCode.OK).send({
        message: 'OK'
      });
      return;
    }

    // delete project + user if have collaborators
    console.log(checkPid.data()['collaborators']);
    let collaborators = checkPid.data()['collaborators'];
    if (!(collaborators === undefined || collaborators === null)) {
      for (const c of collaborators) {
        console.log(collaborators);
        await admin.firestore().collection("users").doc(c).update({
          collaborated: FieldValue.arrayRemove(pid),
        });

      }
    }
    // delete all field in this project
    await admin.firestore().collection("projects").doc(pid).delete();
    res.status(statusCode.OK).send({
      message: "OK",
    });
    return;
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("DELETE -> projects: ", error);
  }
});

/*
@api {GET} /v1/projects/invite Get the invitation
*/
router.get("/invite", async (req, res) => {
  const { pid } = req.query;
  try {
    if (!DataValidation.allNotUndefined(pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let result = [];
    let invitationSnapshot = await admin.firestore().collection("projects").doc(pid).collection("invitation").get();
    // if (invitationSnapshot.empty) {
    //   res.status(statusCode.NotFound).send({
    //     message: "No invitation yet!"
    //   });
    //   return;
    // }
    let invitationDoc = invitationSnapshot.docs.map((document) => result.push(document.data()));

    if (invitationDoc.length != 0) {
      res.status(statusCode.OK).send({
        result: result
      })
    }

  }
  catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> invite: ", error);
  }
})
/*
@api {POST} /v1/projects/invite Create the invitation
*/
router.post("/invite", async (req, res) => {
  // WTF: from what !!!
  // big bug !!!
  const { pid, from, to } = req.body;
  try {
    if (!DataValidation.allNotUndefined(pid, from, to)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    if (from === to) {
      res.status(statusCode.NotAcceptable).send({
        message: "Cannot invite yourself"
      });
      return;
    }
    //check re-invite someone existed???
    let invitationSnapshot = await admin.firestore().collection("projects").doc(pid).collection("invitation").get();
    let checkInvitationExisted = invitationSnapshot.docs.map((document) => {
      if (to === document.data()["to"]) {
        return true;
      }
      return false;
    });
    if (checkInvitationExisted.includes(true)) {
      res.status(statusCode.NotAcceptable).send({
        message: `${to} has already existed`
      });
      return;
    };
    // B1. Lấy uid của auth user
    // B2. Kiểm tra auth user có quyền mời trên project pid hay không?
    // B3. Mời người dùng khác
    let projectDoc = admin.firestore().collection("projects").doc(pid);
    if ((await projectDoc.get()).data()["ownerId"] != req.user.uid) {
      res.status(StatusCode.Forbidden).send({
        message: `Project [${pid}]: Permission denied`,
      });
      return;
    }
    let invitationId = Date.now().toString();
    const message = {
      from: req.user.uid,
      to: to,
      time: Date.now().toString(),
      project: pid,
      id: invitationId,
    };
    await projectDoc.collection("invitation").doc(invitationId).set(message);
    // send invitation to collaborator
    await admin
      .firestore()
      .collection("users")
      .doc(to)
      .collection("invitation")
      .doc(invitationId)
      .set(message);

    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (err) {
    res.status(statusCode.InternalServerError).send({
      ...err,
    });
    console.log("POST -> invite: ", err);
  }
});

/*
@api {DELETE} /v1/projects/invite Delete the invitation
*/
router.delete("/invite", async (req, res) => {
  // pid is unnecessary
  const { pid, invitationId } = req.query;
  try {
    if (!DataValidation.allNotUndefined(invitationId, pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }

    // let projectDoc = admin.firestore().collection("projects").doc(pid);
    // const ownerId = (await projectDoc.get()).data()["ownerId"];
    // if (ownerId !== req.user.uid) {
    //   res.status(StatusCode.Forbidden).send({
    //     message: `Project [${pid}]: Permission Denied`,
    //   });
    //   return;
    // }

    let invitationDoc = admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("invitation")
      .doc(invitationId);

    const { from, to } = (await invitationDoc.get()).data();
    // if (ownerId !== from) {
    //   res.status(StatusCode.BadRequest).send({
    //     message: "Project owner is mismatch",
    //   });
    //   return;
    // }

    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("invitation")
      .doc(invitationId)
      .delete();
    // delete invitation of collaborator
    await admin
      .firestore()
      .collection("users")
      .doc(to)
      .collection("invitation")
      .doc(invitationId)
      .delete();
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("DELETE -> invitation: ", error);
  }
});

/*
@api {POST} /v1/projects/invite/accept Accept the invitation
*/
router.post("/invite/accept", async (req, res) => {
  const { pid, invitationId } = req.body;
  // Get the invitation data from its id

  // Remember to put the collaborator data into collaborator collection

  try {
    if (!DataValidation.allNotUndefined(invitationId, pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    let getInvitation = await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .collection("invitation")
      .doc(invitationId)
      .get();
    console.log(await getInvitation.data());
    let uid = req.user.uid;
    let invitedUser = await getInvitation.data()["to"];
    if (getInvitation.exists) {
      // delete the invitation in project
      await admin
        .firestore()
        .collection("projects")
        .doc(pid)
        .collection("invitation")
        .doc(invitationId)
        .delete();
      // delete the invitation of user
      await admin
        .firestore()
        .collection("users")
        .doc(invitedUser)
        .collection("invitation")
        .doc(invitationId)
        .delete();
      await admin
        .firestore()
        .collection("projects")
        .doc(pid)
        .update({
          collaborators: FieldValue.arrayUnion(getInvitation.data()["to"]),
        });
      await admin
        .firestore()
        .collection("users")
        .doc(getInvitation.data()["to"])
        .update({
          collaborated: FieldValue.arrayUnion(pid),
        });
      res.status(statusCode.OK).send({
        message: "OK",
      });
    }
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("POST -> invitation/accept: ", error);
  }
});

/*
@api {GET} /v1/projects/collaborators Get the list of collaborators
*/
router.get("/collaborators", async (req, res) => {
  // User permission
  const { pid } = req.query;
  try {
    if (!DataValidation.allNotUndefined(pid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
      return;
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    let getCollaborators = (await admin.firestore().collection("projects").doc(pid).get()).data().collaborators;
    res.status(statusCode.OK).send({
      collaborators: getCollaborators,
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("GET -> collaborators: ", error);
  }
});

/*
@api {DELETE} /v1/projects/collaborators Remove a collaborator
*/
router.delete("/collaborators", async (req, res) => {
  const { pid, cid } = req.query;
  try {
    if (!DataValidation.allNotUndefined(pid, cid)) {
      res.status(statusCode.NotFound).send({
        message: "Not Found",
      });
    }
    if (!checkProjectPerm(res, pid, req.user.uid)) {
      return;
    }
    await admin
      .firestore()
      .collection("projects")
      .doc(pid)
      .update({
        collaborators: FieldValue.arrayRemove(cid),
      });
    // delete collaborated of user
    await admin
      .firestore()
      .collection("users")
      .doc(cid)
      .update({
        collaborated: FieldValue.arrayRemove(pid),
      });
    res.status(statusCode.OK).send({
      message: "OK",
    });
  } catch (error) {
    res.status(statusCode.InternalServerError).send({
      ...error,
    });
    console.log("DELETE -> collaborators: ", error);
  }
});

module.exports = router;
