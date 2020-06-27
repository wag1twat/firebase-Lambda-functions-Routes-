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
      operation: 'GET STATIC USER BY ID',
      body: request.body,
      result: {
        error: 'ACCESS DENIED / TOKEN BY USER ID UNDEFINED',
      },
    })
  }
})

router.post('/', async (request, response) => {
  const result = []
  const StaticUser = await db
    .ref('ChatStatic')
    .child(`${request.body.UserId}`)
    .once('value')
  const TotalUnReadMsg = StaticUser.child('TotalUnReadMsg').val()
  StaticUser.forEach((doc) => {
    if (doc.exists()) {
      const _doc = doc.val()
      if (typeof _doc === 'object') {
        result.push(_doc)
      }
    }
  })
  if (StaticUser.exists()) {
    admin
      .database()
      .ref('LogWeb')
      .push({
        date: Date(Date.now()).toString(),
        method: '/get/static/user',
        request: request.body,
      })
    return response.status(200).json({
      operation: 'GET STATIC USER BY ID',
      body: request.body,
      result,
      total: TotalUnReadMsg,
    })
  } else {
    return response.status(500).json({
      operation: 'GET STATIC USER BY ID',
      body: request.body,
      result: {
        error: 'USER UNDEFINED',
      },
    })
  }
})

module.exports = router
