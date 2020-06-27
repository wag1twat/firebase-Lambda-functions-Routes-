const functions = require('firebase-functions')
const express = require('express')
const app = express()
const main = express()
const bodyParser = require('body-parser')
const cors = require('cors')
// INITIALIZE DATABASE
const admin = require('./InitAdmin')
const DB = admin.database()
//routes
const resetMsgControll = require('./routes/resetMsgCountRoute')
const updateMsgControll = require('./routes/updateMsgCountRoute')
const getStaticUserControll = require('./routes/getMsgCountRoute')
const sendPushNotificationControll = require('./routes/sendPushNotification')
const updateVacNotifyCountControll = require('./routes/updateVacNotifyCountRoute')
const createChats = require('./routes/createChats')
const deleteChats = require('./routes/deleteChats')
const addUserToChats = require('./routes/addUserToChat')
const deleteUserFromChats = require('./routes/deleteUserFromChat')
//helpers
const addMessageToChatAtId = require('./routes/__HELPERS')
//forks
app.use('/reset/user/msg/count', resetMsgControll)
app.use('/update/user/msg/count', updateMsgControll)
app.use('/get/static/user', getStaticUserControll)
app.use('/send/push/notification', sendPushNotificationControll)
app.use('/update/vac/notify/count', updateVacNotifyCountControll)
app.use('/create/chats', createChats)
app.use('/delete/chats', deleteChats)
app.use('/add/user/to/chats', addUserToChats)
app.use('/delete/user/from/chats', deleteUserFromChats)
//__HELPERS
app.use(`/add/message/to/chat/at/id`, addMessageToChatAtId)

main.use('/v1', app)
main.use(bodyParser.json())
main.use(bodyParser.urlencoded({ extended: false }))
main.use(cors)

exports.api = functions.region('europe-west1').https.onRequest(main)

exports.notifications = functions
  .region('europe-west1')
  .database.ref('ChatApp/{ChatKey}/Message/{mesId}')
  .onCreate(async (snapshot, context) => {
    //=========================================================================//
    const UserId = await snapshot.val().UserId
    const { ChatKey } = context.params
    //=========================================================================//
    if (snapshot.exists()) {
      //=========================================================================//
      const messagesAfter = snapshot.val()
      const PathChatUsersFromChat = `ChatApp/${ChatKey}/ChatUsers`
      const options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24,
      }
      //=========================================================================//
      const payload = {
        notification: {
          title: `${messagesAfter.UserName}`,
          body: `${messagesAfter.UserMessage}`,
          sound: 'default',
          //badge: `10000`,
        },
      }
      //=========================================================================//
      const getAllUsers = DB.ref('Users').once('value')
      const localUsers = DB.ref(PathChatUsersFromChat).once('value')
      const allChats = DB.ref('ChatApp').once('value')
      //=========================================================================//
      const results = await Promise.all([getAllUsers, localUsers, allChats])
      const check = results.every((r) => r.exists())
      //=========================================================================//
      if (check) {
        const UsersWithTokensFromChat = []
        const Users = []
        const ChatUsers = []
        //=========================================================================//
        results[0].forEach((doc) => {
          const Id = doc.val().Id
          const Token = doc.val().Token
          const Key = doc.key
          const User = { Id, Token, Key }
          Users.push(User)
        })
        //=========================================================================//
        results[1].forEach((doc) => {
          const Id = doc.val().Id
          const countUnReadMsg = doc.val().countUnReadMsg
          const Key = doc.key
          const ChatUser = { Id, Key, countUnReadMsg }
          ChatUsers.push(ChatUser)
        })
        //=========================================================================//
        Users.map((User) => {
          const Token = User.Token
          const UserId = String(User.Id)
          const existsUser = ChatUsers.find(
            (ChatUser) => String(ChatUser.Id) === UserId
          )
          if (existsUser)
            return UsersWithTokensFromChat.push({ ...existsUser, Token })
        })
        //=========================================================================//
        const UsersWithTokensFromChatWithOutSender = UsersWithTokensFromChat.filter(
          (User) => String(User.Id) !== String(UserId)
        )
        //=========================================================================//
        await UpdateCountUnReadMsg(
          PathChatUsersFromChat,
          UsersWithTokensFromChatWithOutSender
        )
        //=========================================================================//
        /* await UpdateTotalUnReadMsg() */
        //=========================================================================//
        await SendingPushNotify(
          UsersWithTokensFromChatWithOutSender,
          payload,
          options
        )
        //=========================================================================//
      }
    }
  })
//=========================================================================//
exports.countUnReadMsg = functions
  .region('europe-west1')
  .database.ref('ChatApp/{ChatId}/ChatUsers/{ChatUserId}')
  .onUpdate(async (snapshot, context) => {
    await UpdateTotalUnReadMsg()
  })
//=========================================================================//
exports.onDeleteChat = functions
  .region('europe-west1')
  .database.ref('ChatApp/{ChatId}')
  .onDelete(async (snapshot, context) => {
    if (snapshot.exists()) {
      const ChatId = snapshot.val().Id
      await UpdateChatsInChatStaticIfDeleteChat(ChatId)
    }
  })
//=========================================================================//
exports.onDeleteUserFromChat = functions
  .region('europe-west1')
  .database.ref('ChatApp/{ChatKey}/ChatUsers/{UserKey}')
  .onDelete(async (snapshot, context) => {
    if (snapshot.exists()) {
      const { ChatKey } = context.params
      const _ChatId = await DB.ref(`ChatApp/${ChatKey}`)
        .child('Id')
        .once('value')
      if (_ChatId.exists()) {
        const ChatId = _ChatId.val()
        const UserId = snapshot.val().Id
        await UpdateChatsInChatStaticIfDeleteUser(ChatId, UserId)
      }
    }
  })
//=========================================================================//
/* UPDATE CHATS IN CHAT STATIC */
const UpdateChatsInChatStaticIfDeleteChat = async (ChatId) => {
  const ChatStatic = await DB.ref('ChatStatic').once('value')
  ChatStatic.forEach((user) => {
    if (user.exists()) {
      const userKey = user.key
      user.forEach((chat) => {
        if (chat.exists()) {
          DB.ref(`ChatStatic/${userKey}/${ChatId}`).remove((err) => {
            if (!err) {
              console.log(
                `//=========================================================================//`,
                `exports.onDeleteChat > result > success delete chat ${ChatId}`,
                `//=========================================================================//`
              )
            } else {
              console.error(
                `//=========================================================================//`,
                `exports.onDeleteChat > result > failed delete chat ${ChatId}`,
                `//=========================================================================//`
              )
            }
          })
        }
      })
    }
  })
}
const UpdateChatsInChatStaticIfDeleteUser = async (ChatId, UserId) => {
  await DB.ref(`ChatStatic/${UserId}/${ChatId}`).remove((err) => {
    if (!err) {
      console.log(
        `//=========================================================================//`,
        `exports.onDeleteChat > result > success delete chat ${ChatId}`,
        `//=========================================================================//`
      )
    } else {
      console.error(
        `//=========================================================================//`,
        `exports.onDeleteChat > result > failed delete chat ${ChatId}`,
        `//=========================================================================//`
      )
    }
  })
}
/* UPDATE USER'S countUnReadMsg IN CHAT */
const UpdateCountUnReadMsg = async (
  PathChatUsersFromChat,
  UsersWithTokensFromChatWithOutSender
) => {
  for await (const User of UsersWithTokensFromChatWithOutSender) {
    /* prevCountUnReadMsg */
    const prevCountUnReadMsg = Number(User.countUnReadMsg)
    /* nextCountUnReadMsg */
    const nextCountUnReadMsg = !isNaN(prevCountUnReadMsg)
      ? prevCountUnReadMsg + 1
      : 0
    const Key = User.Key
    await DB.ref(`${PathChatUsersFromChat}/${Key}`).update({
      Id: User.Id,
      countUnReadMsg: nextCountUnReadMsg,
    })
  }
}
/* SEND PUSH NOTIFY FUNCTION */
const SendingPushNotify = async (
  UsersWithTokensFromChatWithOutSender,
  payload,
  options
) => {
  for await (const User of UsersWithTokensFromChatWithOutSender) {
    const TotalUnReadMsg = await DB.ref(
      `ChatStatic/${User.Id}/TotalUnReadMsg`
    ).once('value')
    admin
      .messaging()
      .sendToDevice(
        User.Token,
        {
          ...payload,
          notification: {
            ...payload.notification,
            badge: `${TotalUnReadMsg.val()}`,
          },
        },
        options
      )
      .then((response) => {
        //return console.log('Successfully sent message:', response)
        return response
      })
      .catch((error) => {
        //return console.error('Error sending message:', error)
        return error
      })
  }
}
/* UPDATE TOTAL COUNT UN READ MESSAGES */
const UpdateTotalUnReadMsg = async () => {
  const allChats = await DB.ref('ChatApp').once('value')
  /* === */
  const chats = []
  allChats.forEach((doc) => {
    const ChatId = doc.val().Id
    const Key = doc.key
    doc.child(`ChatUsers`).forEach((child) => {
      const User = child.val()
      chats.push({ ChatId, Key, User })
    })
  })
  for await (chat of chats) {
    if (chat.User.Id && chat.ChatId) {
      await DB.ref(`ChatStatic/${chat.User.Id}`).update({
        [chat.ChatId]: {
          ChatId: chat.ChatId,
          ChatKey: chat.Key,
          ...chat.User,
        },
      })
    }
  }
  for await (chat of chats) {
    let TotalUnReadMsg = 0
    const ChatStaticById = await DB.ref(`ChatStatic/${chat.User.Id}`).once(
      'value'
    )
    ChatStaticById.forEach((doc) => {
      const countUnReadMsg = doc.val().countUnReadMsg
      if (countUnReadMsg && !isNaN(Number(countUnReadMsg))) {
        TotalUnReadMsg = TotalUnReadMsg + countUnReadMsg
      }
    })
    if (chat.User.Id) {
      await DB.ref(`ChatStatic/${chat.User.Id}`).update({
        TotalUnReadMsg,
      })
    }
  }
}
/*  */
const server = app.listen(3030, () => {
  const host = server.address().address
  const port = server.address().port
  console.log('server listening at http://%s:%s', host, port)
})
