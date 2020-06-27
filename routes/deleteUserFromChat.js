const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()
//names
const operation = 'DELETE USER FROM CHATS'
//const errorVerify = "ACCESS DENIED / USER ID TO DELETE FROM CHAT UNDEFINED";
const error = 'CHATS UNDEFINED OR CHATS LENGTH === 0 OR DATA TYPE INCORRECT'
//middleware access denied
router.use(async (request, response, next) => {
  const arrIds = request.body.chatsIds
  const UserId = request.body.UserId
  if (Array.isArray(arrIds) && arrIds.length > 0 && !isNaN(Number(UserId))) {
    return next()
  } else {
    return response.status(500).json({
      operation,
      body: request.body,
      result: {
        error,
      },
    })
  }
})

router.post('/', async (request, response) => {
  let result = []
  const chats = await admin.database().ref('ChatApp').once('value')
  const arrIds = request.body.chatsIds
  const UserId = request.body.UserId
  const deleteChats = async (arrIds) => {
    const _arrIds = arrIds
    let _chats = []
    let _searched = []
    chats.forEach((i) => {
      let users = []
      let Id = i.val().Id
      let key = i.key
      i.child('ChatUsers').forEach((user) => {
        let Id = user.val().Id
        let key = user.key
        users.push({ Id, key })
      })
      if (i.exists()) {
        _chats.push({ Id, key, users })
      }
    })
    _arrIds.map((Id) => {
      const exist = _chats.find((chat) => String(chat.Id) === String(Id))
      if (exist) _searched.push(exist)
    })
    for (const Chat of _searched) {
      const users = Chat.users
      const exist = users.find((user) => String(user.Id) === String(UserId))
      if (exist) {
        // eslint-disable-next-line
        await admin
          .database()
          .ref(`ChatApp/${Chat.key}/ChatUsers/${exist.key}`)
          .remove(function (error) {
            if (!error) {
              result.push({ ChatId: Chat.Id, UserId: exist.Id, isDelete: true })
            }
          })
      } else {
        result.push({ ChatId: Chat.Id, UserId, isDelete: false })
      }
    }
  }
  await deleteChats(arrIds)
  return response.status(200).json({
    operation,
    body: request.body,
    result,
  })
})

module.exports = router
