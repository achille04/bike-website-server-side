const express = require('express')
const app = express()
const cors = require('cors')
const admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qtxjg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next){

  if(req.headers?.authorization?.startsWith('Bearer ')){

    const token = req.headers.authorization.split(' ')[1];

    try{

      const decodedUser = await admin.auth().verifyIdToken(token)
      req.decodedEmail = decodedUser.email;

    }

    catch{



    }

  }
  next()

}

async function run(){

    try{

        await client.connect();
        const database = client.db('best_bike')
        const exploresCollection = database.collection('explores');
        const usersCollection = database.collection('users');

        app.get('/explores', verifyToken, async(req, res) => {

          const email = req.query.email;
          const date = new Date(req.query.date).toLocaleDateString();

          const query = {email: email, date:date}

          const cursor = exploresCollection.find(query)
          const explores = await cursor.toArray();
          res.json(explores)

        })
        
        app.post('/explores', async(req, res) => {

          const explore = req.body;
          const result = await exploresCollection.insertOne(explore)
          res.json(result)

        });

        app.get('/users/:email', async(req, res) => {

            const email = req.params.email;
            const query = {email:email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin'){
                  isAdmin = true;
            }

            res.json({admin:isAdmin})

        })

        app.post('/users', async (req, res) => {
          const user = req.body;
          const result = await usersCollection.insertOne(user);
          console.log(result);
          res.json(result);

        })

        app.put('/users', async(req, res) => {

            const user = req.body;
            const filter = {email:user.email};
            const options = {upsert: true}
            const updateDoc = {$set: user}
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result)

        })

        app.put('/users/admin', verifyToken, async(req, res) => {

          const user = req.body;
          const requester = req.decodedEmail;
          if(requester){

              const requesterAccount = await usersCollection.findOne({email: requester})
              if(requesterAccount.role === 'admin'){
   
              const filter = {email: user.email}
              const updateDoc = {$set:{role: 'admin'}}
              const result = await usersCollection.updateOne(filter, updateDoc)
              res.json(result);

              }

          }

          else{

              res.status(403).json({message: 'You do not have the access to make a new admin!!!'})

          }

        })

    }

    finally{

        // Ensures that the client will close when you finish/error
        // await client.close();

    }

}

run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Best Bike!')
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})



// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id')
// app.delete('/users/:id')
// users: get
// users: posts