const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const db = admin.database()
//helpers
const convertBooleanString = (param) => {
  switch (param) {
    case 'true':
      return true
    case 'false':
      return false
    default:
      return null
  }
}
//middleware access denied
router.use(async (request, response, next) => {
  const user_id = request.body.user_id
  let usersIds = []
  await db.ref('Users').once('value', (snapshot) => {
    snapshot.forEach((doc) => {
      if (Number(doc.val().Id) === Number(user_id) && doc.val().Token) {
        usersIds.push(doc.val().Id)
      }
    })
  })
  if (
    usersIds[0] &&
    request.body.user_id &&
    request.body.token &&
    request.body.title &&
    request.body.body &&
    request.body.notification_count &&
    request.body.vacancy_count &&
    request.body.is_project_count_change &&
    request.body.is_has_new_project
  ) {
    if (
      !isNaN(Number(request.body.vacancy_count)) &&
      !isNaN(Number(request.body.notification_count)) &&
      convertBooleanString(request.body.is_has_new_project) !== null &&
      convertBooleanString(request.body.is_project_count_change) !== null
    ) {
      return next()
    } else {
      return response.status(500).json({
        method: 'send/push/notification',
        message: 'ONE OF THE PARAMETERS IS NOT SPECIFIED',
      })
    }
  } else {
    return response.status(500).json({
      method: 'send/push/notification',
      message: 'ACCESS DENIED',
    })
  }
})

router.post('/', async (request, response) => {
  const {
    user_id,
    token,
    title,
    body,
    notification_count,
    vacancy_count,
    is_project_count_change,
    is_has_new_project,
  } = request.body
  //
  const ChatStatic = await admin
    .database()
    .ref(`ChatStatic/${user_id}`)
    .once('value')
  let badge = await Object.values(new Object(ChatStatic.val()))
    .reduce((res, el) => {
      el1 = el.User.countUnReadMsg
      res.push(Number(el1))
      el1 += Number(el.User.countUnReadMsg)
      return res
    }, [])
    .reduce((acc, cur) => {
      return acc + cur
    }, 0)
  //
  let options = {
    priority: 'high',
    timeToLive: 60 * 60 * 24,
  }
  let payload = {
    notification: {
      title: `${title}`,
      body: `${body}`,
      sound: 'default',
      badge: `${
        Number(badge) + Number(notification_count) + Number(vacancy_count)
      }`,
    },
  }
  admin
    .messaging()
    .sendToDevice(`${token}`, payload, options)
    .then(async (res) => {
      console.log('Successfully sent message:', res)
      const key = (await admin.database().ref('Users').once('value')).forEach(
        (doc) => {
          if (doc.exists() && Number(doc.val().Id) === Number(user_id)) {
            admin
              .database()
              .ref(`UserDataService/${doc.val().Id}`)
              .update({
                NotifyCount: notification_count,
                VacCount: vacancy_count,
                TotalUnReadMsg:
                  Number(badge) +
                  Number(notification_count) +
                  Number(vacancy_count),
                IsProjectCountChange: convertBooleanString(
                  is_project_count_change
                ),
                IsHasNewProject: convertBooleanString(is_has_new_project),
              })
            admin
              .database()
              .ref('LogWeb')
              .push({
                date: Date(Date.now()).toString(),
                method: '/send/push/notification',
                request: request.body,
              })
          }
        }
      )
      return response.status(200).json({
        method: 'send/push/notification',
        status: 'SUCCESS SEND PUSH NOTIFY',
        ChatStatic: ChatStatic,
        key: key,
      })
    })
    .catch((error) => {
      console.error('Error sending message:', error)
      return response.status(500).json({
        method: 'send/push/notification',
        status: 'FAILED SEND PUSH NOTIFY',
        error: error,
      })
    })
})

module.exports = router
