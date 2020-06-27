const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()
//names
const operation = 'ADD USER TO CHATS'
//const errorVerify = "ACCESS DENIED / USER ID TO ADD CHAT UNDEFINED";
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
  const chats = await admin.database().ref('ChatApp').once('value')
  const arrIds = request.body.chatsIds
  const UserId = request.body.UserId
  //==
  async function update(key, Id) {
    let result = null
    await admin
      .database()
      .ref(`ChatApp/${key}/ChatUsers`)
      .once('value')
      .then(async (data) => {
        let users = []
        data.forEach((d) => {
          if (d.exists()) users.push(d.val().Id)
        })
        let res = await proccessSetDataToBase(key, users, Id)
        return (result = res)
      })
      .catch((err) => console.log(err))
    return result
  }
  const proccessSetDataToBase = async (key, users, Id) => {
    let result = null
    const uniq = users.find((u) => u === Id)
    if (!uniq) {
      await admin
        .database()
        .ref(`ChatApp/${key}/ChatUsers`)
        .push({
          Id,
          countUnReadMsg: 0,
        })
        .then((res) => {
          return res
        })
        .catch((err) => {
          return err
        })
      result = { Id, isAdded: true }
    } else result = { Id, isAdded: false }
    return result
  }
  //==
  const processArray = async (arrIds) => {
    let result = []
    let _chats = []
    let _arrIds = arrIds
    chats.forEach((i) => {
      let Id = i.val().Id
      let key = i.key
      if (i.exists()) {
        _chats.push({ Id, key })
      }
    })
    for (const ChatId of _arrIds) {
      for (const Chat of _chats) {
        if (String(ChatId) === String(Chat.Id)) {
          // eslint-disable-next-line
          let res = await update(Chat.key, UserId)
          result.push({ ...res, ChatId: Chat.Id })
          console.log(`Done! Result > `, res)
          console.log(`Dne! ChatId >`, Chat.Id)
        }
      }
    }
    return result
  }
  const result = await processArray(arrIds)
  admin
    .database()
    .ref('LogWeb')
    .push({
      date: Date(Date.now()).toString(),
      method: '/add/user/to/chats',
      request: request.body,
    })
  return response.status(200).json({
    operation,
    body: request.body,
    result: result,
  })
})

module.exports = router
