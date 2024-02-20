const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('./bookbridge-a9403-firebase-adminsdk-o57n3-4f4b7056e3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const port = 3000;

// Body-parser 미들웨어를 사용하여 JSON 요청 본문을 파싱
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
    console.log('hello world!')
  });

app.post('/register-token', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).send('Token is required');
    }
    
    // Firestore에 토큰 저장
    try {
        // await db.collection('user_tokens').doc('good').add({        
        await db.collection('user_tokens').add({ // 임시로 위에 걸로
            token,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.send({ message: 'Token registered successfully' });
    } catch (error) {
        console.error('Error saving token to Firestore:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


app.post('/send-notification', async (req, res) => {
    const { userId, message } = req.body;
    
    try {
      // 푸시 알림 보내는 함수 호출
      await sendPushNotification(userId, message);
      res.send({ message: 'Notification sent successfully' });
      
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).send('Internal Server Error');
    }
  });

// 특정 사용자에게 푸시 알림을 보내는 함수
async function sendPushNotification(userId, message) {
  // Firestore에서 사용자의 FCM 토큰을 조회
  const userTokenSnapshot = await admin.firestore().collection('user_tokens').doc(userId).get();

  if (!userTokenSnapshot.exists) {
    console.log(`No token found for user: ${userId}`);
    return; // 함수 실행을 여기서 중단
  }

  const userToken = userTokenSnapshot.data().token;

  console.log(`usrToken: ${userToken} , userId: ${userId}`)
  // 메시지 구성
  const payload = {
    notification: {
      title: '새 알림',
      body: message,
    },
    token: userToken,
  };

  // FCM을 통해 푸시 알림 보내기
  admin.messaging().send(payload)
    .then((response) => {
      console.log('Successfully sent message:', response);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
    });
}

