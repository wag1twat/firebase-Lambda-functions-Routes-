const serviceAccount = require('./service.json')
const admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://unipersonal-d61a9.firebaseio.com',
})
// INITIALIZE ADMIN
module.exports = admin
