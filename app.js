const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http'); 
app.use(bodyParser.urlencoded({extended:false}));
const portNum = 3000;
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'ejs');
const server = http.createServer(app);
let client;
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');

//MONGO DB SETUP
const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = { db: "MyStockTracker", collection: "MyStockTrackerUSers" };
async function main() {
    client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});
    try {
      await client.connect();
    } catch (e) {
      console.error(`Error connecting to MongoDB: ${e.message}`);
    } 
}

//MIDDLEWARE SETUP
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());






//ROUTES
main()
app.get('/', (req, res) => {
  res.render('landing.ejs');
});

app.get('/auth/login', (req, res) => {
  res.render('login.ejs'); 
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .findOne({ username });
   
    if (!user || password !== user.password) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/auth/login');
    }
    req.session.user = {
      _id: user._id,
      username: user.username,
    };
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.redirect('/auth/login');
  }
});


//LOGIN CHECK

app.get('/home',(req,res) =>{
  res.render('home.ejs');
});

// SIGN-UP ROUTE
app.get('/auth/signup', (req, res) => {
  res.render('signup.ejs');
});

app.post('/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  my_stocks = "";
  const new_user = {
    username: username,
    password: password,
    my_stocks: ""
  }
  try {
    const existingUser = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).findOne({username})
    if (existingUser) {
      return res.redirect('/auth/signup');
    }
    await insertApplication(client,databaseAndCollection,new_user)
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.redirect('/auth/signup');
  }
});

async function insertApplication(client, databaseAndCollection, newApplication) {
  const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(newApplication);
}



app.listen(portNum, () => {
  console.log(`Server is running on port ${portNum}`);
});