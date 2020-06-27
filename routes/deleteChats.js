const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()
//names
const operation = 'DELETE CHATS'
//const errorVerify = "ACCESS DENIED / OWNER ID TO DELETE CHAT UNDEFINED";
const error = 'CHATS UNDEFINED OR CHATS LENGTH === 0 OR DATA TYPE INCORRECT'
//middleware access denied
router.use(async (request, response, next) => {
  const arrIds = request.body.chatsIds
  const ownerId = request.body.ownerId
  if (Array.isArray(arrIds) && arrIds.length > 0 && !isNaN(Number(ownerId))) {
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
  const ownerId = request.body.ownerId
  const deleteChats = async (arrIds) => {
    const _arrIds = arrIds
    let _chats = []
    let _searched = []
    chats.forEach((i) => {
      let Id = i.val().Id
      let key = i.key
      if (i.exists()) {
        _chats.push({ Id, key })
      }
    })
    _arrIds.map((Id) => {
      const exist = _chats.find((chat) => String(chat.Id) === String(Id))
      if (exist) _searched.push(exist)
      else {
        result.push({ Id, isDelete: false })
      }
    })
    for (const Chat of _searched) {
      // eslint-disable-next-line
      await admin
        .database()
        .ref(`ChatApp/${Chat.key}`)
        .remove(function (error) {
          if (!error) {
            result.push({ Id: Chat.Id, isDelete: true })
          }
        })
    }
  }
  await deleteChats(arrIds)
  return response.status(200).json({
    operation,
    body: request.body,
    result: result,
  })
})

module.exports = router
