const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
const db = admin.database();
//middleware access denied
router.use(async(request, response, next) => {
    const UserId = request.body.UserId;
    let usersIds = [];
    await db.ref("Users").once("value", snapshot => {
        snapshot.forEach(doc => {
            if(Number(doc.val().Id) === Number(UserId) && doc.val().Token) {
                usersIds.push(doc.val().Id)
            }
        });
    });
    if(usersIds[0]){
        return next();
    } else {
        return response.status(500).json({
            message: "ACCESS DENIED"
        })
    }
});

router.post('/', async(request, response) => {
    db.ref(`UserDataService/${request.body.UserId}`).update({
        NotifyCount: request.body.NotifyCount,
        VacCount: request.body.VacCount
    })
    .then(() => {
        return response.status(200).json({
            method: '/update/vac/notify/count',
            status: "SUCCES UPDATE"
        })
    })
    .catch((err) => {
        response.status(500).json({
            method: '/update/vac/notify/count',
            status: "FAILED UPDATE",
            error: err
        })
    })
});

module.exports = router;