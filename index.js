const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('./bookbridge-a9403-firebase-adminsdk-o57n3-4f4b7056e3.json');
const { parseNumbers } = require('xml2js/lib/processors');

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

// app.post('/register-token', async (req, res) => {
//     const { token } = req.body;
//     if (!token) {
//         return res.status(400).send('Token is required');
//     }
    
//     // Firestore에 토큰 저장
//     try {
//         // await db.collection('user_tokens').doc('good').add({        
//         await db.collection('user_tokens').add({ // 임시로 위에 걸로
//             token,
//             createdAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//         res.send({ message: 'Token registered successfully' });
//     } catch (error) {
//         console.error('Error saving token to Firestore:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


app.post('/send-notification', async (req, res) => {
    const { userId, message, chatRoomId } = req.body;
    
    try {
      // 2초 동안 지연시키는 Promise 생성
      await new Promise(resolve => setTimeout(resolve, 2000));
      // 푸시 알림 보내는 함수 호출
      await sendPushNotification(userId, message, chatRoomId);
      res.send({ message: 'Notification sent successfully' });
      
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).send('Internal Server Error');
    }
  });

// 특정 사용자에게 푸시 알림을 보내는 함수
async function sendPushNotification(userId, message, chatRoomId) {

  // Firestore에서 사용자의 FCM 토큰 및 유저 정보 조회
  const userSnapshot = await admin.firestore().collection('User').doc(userId).get();
  
  if (!userSnapshot.exists) {
    console.log(`No token found for user: ${userId}`);
    return; // 함수 실행을 여기서 중단
  }
  const userData = userSnapshot.data();
  const userToken = userData.fcmToken;
  const nickname = userData.nickname;
  const style = userData.style;
  const profileURL = userData.profileURL;

  // 채팅방 조회
  const chatRoomSnapshot = await db.collection('User').doc(userId).collection('chatRoomList').doc(chatRoomId).get();

  if (!chatRoomSnapshot.exists) {
    console.log(`No chat room found for user: ${userId} with chatRoomId: ${chatRoomId}`);
    return; // 채팅방이 없으면 함수 실행 중단
  }

  const chatRoomData = chatRoomSnapshot.data();
  const partnerId = chatRoomData.partnerId;
  const noticeBoardId = chatRoomData.noticeBoardId;
  const noticeBoardTitle = chatRoomData.noticeBoardTitle;
  const count = parseNumbers(await sumNewCounts(partnerId), 0); //bage Count생성

  // console.log(`partnerToken: ${partnerToken} , userId: ${userId}, chatRoomId: ${chatRoomId}, partnerId: ${partnerId}, noticeBoardTitle: ${noticeBoardTitle}, nickname: ${nickname}, Style: ${style}, profileURL: ${profileURL}`)
  // console.log(`reviews: ${reviews} `);
  
  // 메시지 구성
  const payload = {
    notification: {
      title: nickname,
      body: message
    },
    token: userToken,
    data: {
      chatRoomId: chatRoomId,
      userId: userId,
      partnerId: partnerId,
      noticeBoardTitle: noticeBoardTitle,
      noticeBoardId: noticeBoardId,
      nickname: nickname,
      style: style,
      profileURL: profileURL,
      message: message
    },
    apns: {
      payload: {
        aps: {
          sound: "default", // iOS 알림 사운드 설정
          badge : count
        }
      }
    },
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

//chatRoomList 컬렉션 newCount 카운트 반환 함수
async function sumNewCounts(userId) {
  const chatRoomListRef = admin.firestore().collection('User').doc(userId).collection('chatRoomList');
  try {
    const snapshot = await chatRoomListRef.get();
    let totalNewCount = 0; 
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.newCount && typeof data.newCount === 'number') {
        totalNewCount += data.newCount;
      }
    });
    // console.log(`Total newCount for user ${userId}: ${totalNewCount}`);
    return totalNewCount;
  } catch (error) {
    console.error("Error summing newCounts:", error);
    return null;
  }
}