const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

router.post(`/`, async (request, response) => {
  const keyChat = request.body.keyChat
  const UserId = request.body.UserId
  await admin.database().ref(`ChatApp/${keyChat}/Message`).push({
    Avatar: null,
    HorOptions: true,
    MessageDate: new Date(),
    UserId: UserId,
    UserMessage: 'Test message',
    UserName: 'Андрей Самойкин',
  })
  response.status(200).json({
    success: `add message to ${keyChat}`,
  })
})

module.exports = router
