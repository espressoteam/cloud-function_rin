// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.notifyNewUser = functions.database.ref('/users/{userid}/displayName').onWrite(event => {
  if (!event.data.previous.exists()) {
	// new user add
  
    const userid = event.params.userid;

    console.log("event.params=", event.params);
  
    console.log('We have a new user :', userid);

    let msg = ' join our app';
		
    return loadExistingUsers(userid).then(result => {
        let tokens = [];
        for (let user of result.users) {
            if (user.token) {
                tokens.push(user.token);
            }
        }
        console.log("tokens=", tokens);
        let payload = {
            notification: {
                title: 'Travel guide',
                body: result.displayName+msg,
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
            let displayName = "A new user";
            for (var property in data) {
                displayName = data[property].displayName;
                if (property === newUserId) {
                    console.log("new user displayName", data[property].displayName);
                } else {
                    users.push(data[property]);
                }
                
            }
            let result = {users: users, displayName: displayName};
            resolve(result);
        }, (err) => {
            reject(err);
        });
    });
    return defer;
}

exports.notifyFollowed = functions.database.ref('/users/{userid}/following/{target}').onWrite(event => {
    const followerId = event.params.userid;
    const followedId = event.params.target;
    let action = event.data.val()?"following":"unfollowing";

    return Promise.all([loadFollower(followerId), loadFollowed(followedId)]).then(results => {
        let followerDisplayName = results[0].followerDisplayName;
        let targetToken = results[1].targetToken;

        let payload = {
            notification: {
                title: 'Travel guide',
                body: `${followerDisplayName} is ${action} you.`,
                sound: 'default',
                badge: '1',
                icon : "/static/img/icons/logo.png"
            }
        };
        console.log("msg=", payload.notification.body);
        console.log("tokens", targetToken);
        return admin.messaging().sendToDevice(targetToken, payload)
    });
});

exports.notifyFollowing = functions.database.ref('/users/{userid}/following/{target}').onWrite(event => {
    const followerId = event.params.userid;
    const followedId = event.params.target;
    let action = event.data.val()?"following":"unfollowing";

    return Promise.all([loadFollower(followerId), loadFollowed(followedId), loadOtherFollower(followedId)]).then(results => {
        let followerDisplayName = results[0].followerDisplayName;
        let targetDisplayName = results[1].targetDisplayName;
        let targetToken = results[1].targetToken;
        let tokens = results[2];

        let payload = {
            notification: {
                title: 'Travel guide',
                body: `${followerDisplayName} is ${action} ${targetDisplayName}.`,
                sound: 'default',
                badge: '1',
                icon : "/static/img/icons/logo.png"
            }
        };
        console.log("msg=", payload.notification.body);
        console.log("tokens", tokens);
        return admin.messaging().sendToDevice(tokens, payload)
    });
});
    
    
    



function loadFollower(userId) {
    let ref = admin.database().ref(`/users/${userId}`)
    let defer = new Promise((resolve, reject) => {
        ref.once('value', (snap) => {
            let followerUser = snap.val();
            let followerDisplayName = followerUser.displayName;
            let result = {followerDisplayName: followerDisplayName}
            resolve(result);
        },(err) => {
            console.log("loadFollower error");
            reject(err);
        });
    });
    return defer;
}

function loadFollowed(userId) {
    const ref = admin.database().ref(`/users/${userId}`);
    let defer = new Promise((resolve, reject) => {
        ref.once('value', (snap) => {
            let followedUser = snap.val();
            let targetDisplayName = userId;
            let targetToken = null;
            if (followedUser) {
                targetDisplayName = followedUser.displayName
                targetToken = followedUser.token
            }
            let result = {targetDisplayName: targetDisplayName, targetToken: targetToken};
            resolve(result);
        },(err) => {
            console.log("loadFollowed error");
            reject(err);
        });
    }); 
    return defer;
}

function loadOtherFollower(targetId, followerId) {
    const ref = admin.database().ref(`/users`)
    let defer = new Promise((resolve, reject) => {
        ref.once('value', (snap) => {
            let allUsers = snap.val();
            let tokens = [];
            for (var property in allUsers) {
                console.log("allUsers", allUsers[property]);
                if (allUsers[property].following && allUsers[property].following[targetId] && allUsers[property].token) {
                    if (followerId === property) {

                    } else if (allUsers[property].token) {
                        tokens.push(allUsers[property].token);
                    }
                }
            }
            resolve(tokens);
        },(err) => {
            console.log("loadOtherFollower error");
            reject(err);
        });
    });
    return defer;
}
