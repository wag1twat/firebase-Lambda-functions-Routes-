const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()
//names
const operation = 'CREATE CHATS'
//const errorVerify = "ACCESS DENIED / OWNER ID TO CREATE CHAT UNDEFINED";
const error = 'CHATS UNDEFINED OR CHATS LENGTH === 0 OR DATA TYPE INCORRECT'
//middleware access denied
router.use(async (request, response, next) => {
  const arrIds = request.body.chatsIds
  if (Array.isArray(arrIds) && arrIds.length > 0) {
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
  const reqChatsIds = request.body.chatsIds
  //===
  const issuedChats = []
  const chatsIds = []
  const res = await admin.database().ref('ChatApp').once('value')
  res.forEach((r) => {
    chatsIds.push(r.val().Id)
  })
  //==
  const result = reqChatsIds
    .map((k) => {
      const uniq = chatsIds.find((i) => String(i) === String(k.Id))
      if (!uniq) {
        issuedChats.push({ k, isAdded: true })
        return k
      } else issuedChats.push({ k, isAdded: false })
    })
    .filter((i) => i)
  //==
  for await (el of result) {
    const Chat = {
      Id: el.Id,
      Name: el.Name,
      ownerId: request.body.ownerId,
    }
    await admin
      .database()
      .ref('ChatApp')
      .push(Chat, (e) => {
        console.log(`e`, e)
      })
  }
  admin
    .database()
    .ref('LogWeb')
    .push({
      date: Date(Date.now()).toString(),
      method: '/create/chats',
      request: request.body,
    })
  return response.status(200).json({
    operation,
    result: issuedChats,
  })
})

module.exports = router
//
/* const mergeArrayOfObjects = (original, newdata, selector = 'key') => {
  newdata.forEach((dat) => {
    const foundIndex = original.findIndex(
      (ori) => ori[selector] == dat[selector]
    )
    if (foundIndex >= 0) original.splice(foundIndex, 1, dat)
    else original.push(dat)
  })

  return original
}

const result = mergeArrayOfObjects(reqChatsIds, chatsIds, 'Id')
console.log('RESULT -->', result) */
