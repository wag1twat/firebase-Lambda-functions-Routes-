const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const admin = require('firebase-admin')
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))
const DB = admin.database()

router.use(async ({ body }, response, next) => {
  const { UserId, Field, Operation, Value } = body
  const UserDataFromUniService = await DB.ref(`UserDataFromUniService`)
    .child(UserId)
    .once('value')
  if (UserId && Field && Operation && Value) {
    if (UserDataFromUniService.exists()) {
      const Data = UserDataFromUniService.val()
      body.Data = Data
      return next()
    } else {
      await DB.ref(`UserDataFromUniService/${UserId}`).update(
        {
          isHasNewProject: false,
          isProjectCountChange: false,
          NotifyCount: 0,
          VacCount: 0,
        },
        (err) => {
          if (!err) {
            response.status(200).json({
              Operation,
              body,
              result: 'success create default structure',
            })
          } else {
            response.status(500).json({
              Operation,
              body,
              result: 'failed create default structure',
            })
          }
        }
      )
    }
  } else {
    response.status(500).json({
      Operation,
      body,
      result: 'failed',
    })
  }
})
router.post('/', async ({ body }, response) => {
  const { Data, UserId, Field, Operation, Value } = body
  if (Field in Data) {
    if (Operation === 'reset') {
      await DB.ref(`UserDataFromUniService`)
        .child(UserId)
        .update(
          {
            ...Data,
            [Field]: Value,
          },
          (err) => {
            if (!err) {
              return response.status(200).json({
                Operation,
                body,
                result: 'success',
              })
            } else {
              return response.status(500).json({
                Operation,
                body,
                result: 'failed',
              })
            }
          }
        )
    }
  }
})

module.exports = router
