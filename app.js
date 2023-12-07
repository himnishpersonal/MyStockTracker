const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http'); 
const axios = require('axios');
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

//LANDING ROUTES 
app.get('/', (req, res) => {
  res.render('landing.ejs');
});

app.get('/logout', (req, res) => {
  res.render('landing.ejs');
});

app.get('/login', (req, res) => {
  res.render('login.ejs'); 
});


//LOGIN ROUTES
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .findOne({ username });
   
    if (!user || password !== user.password) {
      req.flash('error', 'Invalid username or password');
      return res.redirect('/login');
    }
    req.session.user = {
      _id: user._id,
      username: user.username,
    };
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});


//COMPANY INFO ROUTES
app.get('/companyInfo', (req, res) => {
  res.render('companyInfo.ejs'); 
});

app.post('/companyInfo', async (req,res) =>{
  try {
    const tickername = req.body.search;
    const tickerNews = await getNews(tickername);
    const news_data = tickerNews.data;
    const formatted_news = formatNewsData(news_data);
    const tickerAnalytics = await getAnalytics(tickername);
    const analytics_data = tickerAnalytics.data;
    const formatted_analytics = formatAnalyticsData(analytics_data);
    res.render('compInfoRes.ejs', { keyStatistics: formatted_analytics, tickername: tickername, formattedNews: formatted_news });
  } catch (error) {
      console.error(error);
  }
});

function formatAnalyticsData(analyticsData) {
  const keyStatistics = analyticsData;
  const formattedData = [
    `Current Price: $${keyStatistics.currentPrice.fmt}`,
    `Target High Price: $${keyStatistics.targetHighPrice.fmt}`,
    `Target Low Price: $${keyStatistics.targetLowPrice.fmt}`,
    `Target Mean Price: $${keyStatistics.targetMeanPrice.fmt}`,
    `Target Median Price: $${keyStatistics.targetMedianPrice.fmt}`,
    `Recommendation: ${keyStatistics.recommendationKey}`,
    `Number of Analyst Opinions: ${keyStatistics.numberOfAnalystOpinions.fmt}`,
    `Total Cash: $${keyStatistics.totalCash.fmt}`,
    `Total Cash Per Share: $${keyStatistics.totalCashPerShare.fmt}`,
    `EBITDA: $${keyStatistics.ebitda.fmt}`,
  ];

  return formattedData;
}

function formatNewsData(newsData) {
  const formattedNews = [];
  const sortedNews = Object.values(newsData).sort((a, b) => b.providerPublishTime - a.providerPublishTime);
  const top3News = sortedNews.slice(0, 3);
  top3News.forEach(article => {
    const formattedArticle = {
      title: article.title,
      publisher: article.publisher,
      link: article.link,
      publishTime: new Date(article.providerPublishTime * 1000).toLocaleString(),
    };
    formattedNews.push(formattedArticle);
  });
  return formattedNews;
}





async function getNews(tickername){
  const options = {
    method: 'GET',
    url: `https://yahoo-finance127.p.rapidapi.com/news/${tickername}`,
    headers: {
      'X-RapidAPI-Key': 'e19828b0f0msha4b5fd0247fa8efp1241e9jsn21d78152afb8',
      'X-RapidAPI-Host': 'yahoo-finance127.p.rapidapi.com'
    }
  };
  try {
    const response = await axios.request(options);
    return response
  } catch (error) {
    console.error(error);
  }
}

async function getAnalytics(tickername){
  const options = {
    method: 'GET',
    url: `https://yahoo-finance127.p.rapidapi.com/finance-analytics/${tickername}`,
    headers: {
      'X-RapidAPI-Key': 'e19828b0f0msha4b5fd0247fa8efp1241e9jsn21d78152afb8',
      'X-RapidAPI-Host': 'yahoo-finance127.p.rapidapi.com'
    }
  };
  try {
    const response = await axios.request(options);
    return response;
  } catch (error) {
    console.error(error);
  }
}


//HOME ROUTES AND FUNCTIONS
app.get('/home',(req,res) =>{
  res.render('home.ejs');
});

app.post('/home', async (req,res) =>{
    try {
        const searchInput = req.body.search;
        const tickerNames = searchInput;
        const stockInfo = await fetchDataFromAPI(tickerNames);
        const stockData = stockInfo.data;
        const stockChanges = calculateStockChange(stockData);
        res.render('results.ejs',{stockChanges});
    } catch (error) {
        console.error(error);
    }
});

async function fetchDataFromAPI(tickerNames) {
  const options = {
      method: 'GET',
      url: `https://yahoo-finance127.p.rapidapi.com/multi-quote/${tickerNames}`,
      headers: {
          'X-RapidAPI-Key': 'e19828b0f0msha4b5fd0247fa8efp1241e9jsn21d78152afb8',
          'X-RapidAPI-Host': 'yahoo-finance127.p.rapidapi.com'
      }
  };
  try {
      const response = await axios.request(options);
      return response
  } catch (error) {
      console.error(error);
      throw error;
  }
}

function calculateStockChange(stockData) {
  const stockChanges = [];
  Object.values(stockData).forEach(stock => {
    const symbol = stock.symbol;
    console.log(symbol)
    const stockChange = stock.regularMarketChangePercent.fmt;
    const entry = {
      company : symbol,
      changePercent: stockChange
    };
    stockChanges.push(entry)
  });
  return stockChanges;
}




// SIGN-UP ROUTES AND FUNCTIONS
app.get('/signup', (req, res) => {
  res.render('signup.ejs');
});

app.post('/signup', async (req, res) => {
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
      return res.redirect('/signup');
    }
    await insertApplication(client,databaseAndCollection,new_user)
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.redirect('/signup');
  }
});

async function insertApplication(client, databaseAndCollection, newApplication) {
  const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .insertOne(newApplication);
}

app.post('/addToDashboard', async (req, res) => {
  const selectedStocks = req.body.selectedStocks;
  const username= req.session.user.username;
  result = await client.db(databaseAndCollection.db)
  .collection(databaseAndCollection.collection)
  .updateOne(
    { username: username },
    { $set: { my_stocks: selectedStocks.join(',') } }
  );
  res.send("Updated your stocks!");
});



app.listen(portNum, () => {
  console.log(`Server is running on port ${portNum}`);
});