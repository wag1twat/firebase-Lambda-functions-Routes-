const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const DB = admin.database()
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
  if (
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
  const TotalUnReadMsg = await DB.ref(
    `ChatStatic/${user_id}/TotalUnReadMsg`
  ).once('value')
  const TotalUnReadMsgVal = TotalUnReadMsg.val()
  const badge = !isNaN(Number(TotalUnReadMsgVal))
    ? Number(TotalUnReadMsgVal)
    : 0
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
      const key = (await DB.ref('Users').once('value')).forEach((doc) => {
        if (doc.exists() && Number(doc.val().Id) === Number(user_id)) {
          DB.ref(`UserDataFromUniService/${doc.val().Id}`).update({
            NotifyCount: notification_count,
            VacCount: vacancy_count,
            IsProjectCountChange: convertBooleanString(is_project_count_change),
            IsHasNewProject: convertBooleanString(is_has_new_project),
          })
          DB.ref('LogWeb').push({
            date: Date(Date.now()).toString(),
            method: '/send/push/notification',
            request: request.body,
          })
        }
      })
      return response.status(200).json({
        method: 'send/push/notification',
        status: 'SUCCESS SEND PUSH NOTIFY',
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
