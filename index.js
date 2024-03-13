const express = require('express');
const cors = require('cors');
// const jwt = require('jsonwebtoken')
const jwt = require('jsonwebtoken')
// const cookiepersser = require('cookie-parser')
const cookiePersser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//mid

// app.use(cors({
//     origin: ["http://localhost:5173"],
//     credentials: true
// }));
app.use(cors({
    origin: [
        // 'http://localhost:5173'
        'https://cars-doctor-98dad.web.app/',
        'https://cars-doctor-98dad.firebaseapp.com/'
    ],
    credentials: true
}))
app.use(express.json());
app.use(cookiePersser())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oyebmuz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

//midilwar
const logger = async (req, res, next) => {
    console.log("log info: ", req.method, req.url)
    next()
}

const varifyToken = async (req, res, next) => {
    const token = req.cookies.token;
    // console.log('token in the moddelewere', token);

    if (!token) {
        return res.status(401).send({ message: "unauthorozed token" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: "unauthorized access" })
        }
        req.user = decoded;
        next()
    })
    // next() 
}




async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //database and collection create

        const servicesCollection = client.db('carsDoctor').collection('services');
        const bookingCollection = client.db('carsDoctor').collection('booking');

        //jwt token

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log("token user", user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true });
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log("login in out", user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        //services related
        app.get('/services', logger, async (req, res) => {
            const cursor = servicesCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, imdb: 1, img: 1, price: 1, },
            };
            const result = await servicesCollection.findOne(query, options)
            res.send(result)
        })

        //booking

        app.get('/booking', logger, varifyToken, async (req, res) => {

            console.log('request woner info', req.user)
            console.log(req.query?.email)


            if (req.user.email !== req.query?.email) {
                return res.status(403).send({ message: "forbiden error" })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            console.log(booking)
            const result = await bookingCollection.insertOne(booking)
            res.send(result)
        })

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const updatedbooking = req.body;
            console.log(updatedbooking)
            const filter = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    status: updatedbooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, update)
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('my doctor server is running')
})

app.listen(port, (req, res) => {
    console.log('my port is', port)
})