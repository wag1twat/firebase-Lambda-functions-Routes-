const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()

//middleware access denied
router.use(async (request, response, next) => {
  const UserId = request.body.UserId
  let usersIds = []
  await db.ref('Users').once('value', (snapshot) => {
    snapshot.forEach((doc) => {
      if (Number(doc.val().Id) === Number(UserId) && doc.val().Token) {
        usersIds.push(doc.val().Id)
      }
    })
  })
  if (usersIds[0]) {
    return next()
  } else {
    return response.status(500).json({
      message: 'ACCESS DENIED',
    })
  }
})

router.post('/', async ({ body }, response) => {
  const ref = db.ref(`ChatApp/${body.ChatKey}/ChatUsers`).orderByKey()
  const promise = await ref.once('value')
  if (promise.exists()) {
    promise.forEach((doc) => {
      // for each firebase
      if (doc.exists() && Number(doc.val().Id) === Number(body.UserId)) {
        db.ref(`/ChatApp/${body.ChatKey}/ChatUsers/${doc.key}`).update({
          ...doc.val(),
          countUnReadMsg: 0,
        })
      }
    })
  }
  //
  admin
    .database()
    .ref('LogWeb')
    .push({
      date: Date(Date.now()).toString(),
      method: '/reset/user/msg/count',
      request: body,
    })
  //
  return response.status(200).json({
    request: {
      message: 'ЗАПРОС >>> /reset/user/msg/count',
    },
    result: true,
  })
})

module.exports = router
