const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()

//middleware access denied
router.use(async ({ body }, response, next) => {
  const SenderUserId = body.SenderUserId
  let usersIds = []
  await db.ref('Users').once('value', (snapshot) => {
    snapshot.forEach((doc) => {
      if (Number(doc.val().Id) === Number(SenderUserId) && doc.val().Token) {
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
      if (doc.exists() && Number(doc.val().Id) !== Number(body.SenderUserId)) {
        db.ref(`/ChatApp/${body.ChatKey}/ChatUsers/${doc.key}`).update({
          ...doc.val(),
          countUnReadMsg: doc.val().countUnReadMsg
            ? Number(doc.val().countUnReadMsg) + 1
            : 1,
        })
      }
    })
  }
  //DATABASE REFS
  const getAllUsers = admin.database().ref('Users').once('value')
  const localUsers = admin
    .database()
    .ref(`ChatApp/${body.ChatKey}/ChatUsers`)
    .once('value')
  const allChats = admin.database().ref('ChatApp').once('value')
  const ChatId = admin.database().ref(`ChatApp/${body.ChatKey}`).once('value')
  //
  let results = await Promise.all([getAllUsers, localUsers, allChats, ChatId])
  let check = results.every((r) => r.exists())
  results = results.map((r) => r)
  if (check) {
    //
    let users = results[0]
    let localUsers = results[1]
    let mainDataChats = results[2]
    let ChatIdWhereSendMsg = results[3].val().Id
    //
    let localUsersWithOutSender = []
    localUsers.forEach((localUser) => {
      if (Number(localUser.val().Id) !== Number(body.SenderUserId)) {
        localUsersWithOutSender.push(localUser.val())
      }
    })
    //
    localUsersWithOutSender.map(async (item) => {
      let pushed = []
      mainDataChats.forEach((mdc) => {
        let ChatId = mdc.val().Id
        mdc.child('ChatUsers').forEach((cu) => {
          if (Number(cu.val().Id) === Number(item.Id) && ChatIdWhereSendMsg === ChatId) {
            pushed.push({
              ChatId: ChatId,
              User: item,
            })
          }
        })
      })
      admin
        .database()
        .ref('ChatStatic')
        .update({
          [item.Id]: pushed,
        })
      return pushed
    })
    //
    admin
      .database()
      .ref('LogWeb')
      .push({
        date: Date(Date.now()).toString(),
        method: '/update/user/msg/count',
        request: body,
      })
    //
    return response.status(200).json({
      request: {
        message: 'ЗАПРОС',
        body,
      },
      results: {
        updateUsers: {
          message: 'АЙПДЕЙТ НЕПРОЧИТАННЫХ СООБЩЕНИЙ',
          body: {
            users,
          },
        },
      },
    })
  } else {
    return response.status(500).json({
      request: {
        message: 'Внутренняя ошибка',
      },
    })
  }
})

module.exports = router