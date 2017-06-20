// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.notifyNewUser = functions.database.ref('/users/{userid}').onWrite(event => {
  if (!event.data.previous.exists()) {
	// new user add
  
    const userid = event.params.userid;
  
    console.log('We have a new user :', userid);

    let msg = 'A new user join our app';
		
    return loadExistingUsers(userid).then(users => {
        let tokens = [];
        for (let user of users) {
            tokens.push(user.token);
        }
        console.log("tokens=", tokens);
        let payload = {
            notification: {
                title: 'Travel guide',
                body: msg,
                sound: 'default',
                badge: '1',
                icon : "/static/img/icons/logo.png"
            }
        };
        return admin.messaging().sendToDevice(tokens, payload);
    });

  }
});

function loadExistingUsers(newUserId) {
    let dbRef = admin.database().ref('/users');
    let defer = new Promise((resolve, reject) => {
        dbRef.once('value', (snap) => {
            let data = snap.val();
            console.log("data=", data);
            let users = [];
            for (var property in data) {
                console.log("data[property]=",data[property]);
                if (property === newUserId) {

                } else {
                    users.push(data[property]);
                }
                
            }
            resolve(users);
        }, (err) => {
            reject(err);
        });
    });
    return defer;
}