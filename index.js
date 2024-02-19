const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
const serviceAccount = require('./bookbridge-a9403-firebase-adminsdk-o57n3-4d6020358f.json');

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
        await db.collection('user_tokens').doc('good').add({        
        // await db.collection('user_tokens').add({ 임시로 위에 걸로
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
