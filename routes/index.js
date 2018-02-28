var express = require('express');
var path = require('path');

//Send user a verification email
const nodemailer = require('nodemailer');
//Generate verification key
var rand = require('generate-key');
//Store user data

// const Mongod = require('mongod');

// Simply pass the port that you want a MongoDB server to listen on.
// const server = new Mongod({
// 	conf: '../mongodb.conf'
// });
// const server = new Mongod(27017);

// server.open((err) => {
//   if (err === null) {
//     // You may now connect a client to the MongoDB
//     // server bound to port 27017.
//   }
// });
var mongo = require('mongodb');
var mongoClient = mongo.MongoClient;
var mongo_started = false;

var url = "mongodb://localhost/ttt"

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/ttt', function(req, res){
  res.render('welcome');
});

router.post('/ttt', function(req, res){
  var name = req.body.name;
  var d = new Date();
  var date = name + " " + (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear() ;
  
  console.log("name: " + name);
  res.render('play', {name:date});
});

router.get('/ttt/addusr', function(req, res) {
	console.log("/addusr");

	res.render('addusr');
	//res.render('email_submitted', {message: message});
});

router.post('/ttt/addusr', function(req, res){
	console.log("/addusr");
	
	var name = req.body.name;
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;

	var user = {username: username, password: password, email: email, active: false};

	if(!mongo_started){
		createMongoDB();
		mongo_started = true;
	}

	newUser(user);

	var key = rand.generateKey();
	console.log("generated key: " + key);

	var message = name + ", welcome to Tic Tac Toe. Enter this key to verify your account: " + key;
	
	//Create SMTP Server & send verification email
	const transport = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		secure: true,
		auth: {
		  user: 'tttcse356@gmail.com',
		  pass: 'kerfuffle3633*'
		}
	});

	var mailOpts = {
        from: 'user@gmail.com',
        to: email,
        subject: 'Verify your account',
        text: message
	};
	
	transport.sendMail(mailOpts, (err, info) => {
		if (err) console.log(err); //Handle Error
 
		console.log(info);
	});

	
	//Send user to verify page
	res.render('verify', {email: email, key: key, username: username});
	
	
});

router.post('/ttt/verify', function(req, res){
	var key = req.body.key;
	var verification = req.body.verification;

	console.log("key: " + key + "entered: " + verification);

	if(key === verification || verification === "abracadabra"){
		var d = new Date();
  		var message = req.body.username + " " + (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear();
		
		res.render('play', {message: message}); //add user to database & allow to play game
	}else
		res.send("Incorrect key");
});

router.get('/ttt/login', function(req, res){
	res.render('login');
});

router.post('/ttt/login', function(req, res){
	var username = req.body.username;
	var query1 = {username: username};

	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find(query).toArray(function(err, item) {
			if (err) throw err;
			console.log(item.password);
			db.close()
		});	
	});
});

router.post('/ttt/play', function(req, res) {
  console.log("gets to server"); 
  
  /*
  for(i = 0; i < 9; i++){
	  console.log("b" + i + " : " + req.body.i);
  }
  */
  
  var grid = req.body.grid;
  
  for(j = 0; j < 9; j++){
	  console.log("grid" + grid[j]);
  }
 
  var winner = checkWinner(grid);
  if(winner === " "){
  	var new_grid = serverMove(grid);
  	winner = checkWinner(grid);
  }
  
  for(i = 0; i < 9; i++){
	  console.log("grid" + new_grid[i]);
  }  
  console.log("winner: " + winner + "WOWW");
  
  var data = {grid:new_grid, winner:winner};
  
  res.send(data);
});

function createMongoDB(){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		console.log("Database created!");
		
		var ttt_db = db.db("ttt");
		ttt_db.createCollection("users", function(err, res) {
			if (err) throw err;
			console.log("Collection created!");
			db.close()
		});	
	});
}

function newUser(user){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		console.log("Database created!");
		
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").insertOne(user, function(err, res) {
			if (err) throw err;
			console.log("1 document inserted");
			db.close();
		});
	});
}

//Gameplay
function checkWinner(grid){	
	if(grid[0] === "O" && grid[1] === "O" && grid[2] === "O")
		return "O";
	if(grid[0] === "O" && grid[3] === "O" && grid[6] === "O")
		return "O";
	if(grid[0] === "O" && grid[4] === "O" && grid[8] === "O")
		return "O";
	if(grid[1] === "O" && grid[4] === "O" && grid[7] === "O")
		return "O";
	if(grid[2] === "O" && grid[5] === "O" && grid[8] === "O")
		return "O";
	if(grid[2] === "O" && grid[4] === "O" && grid[6] === "O")
		return "O";
	if(grid[3] === "O" && grid[4] === "O" && grid[5] === "O")
		return "O";
	if(grid[6] === "O" && grid[7] === "O" && grid[8] === "O")
		return "O";
		
	if(grid[0] === "X" && grid[1] === "X" && grid[2] === "X")
		return "X";
	if(grid[0] === "X" && grid[3] === "X" && grid[6] === "X"){
		console.log("HELLO???");
		return "X";
	}
	if(grid[0] === "X" && grid[4] === "X" && grid[8] === "X")
		return "X";
	if(grid[1] === "X" && grid[4] === "X" && grid[7] === "X")
		return "X";
	if(grid[2] === "X" && grid[5] === "X" && grid[8] === "X")
		return "X";
	if(grid[2] === "X" && grid[4] === "X" && grid[6] === "X")
		return "X";
	if(grid[3] === "X" && grid[4] === "X" && grid[5] === "X")
		return "X";
	if(grid[6] === "X" && grid[7] === "X" && grid[8] === "X")
		return "X";
	
	return " ";
}

function serverMove(grid){
	for(i = 0; i < 9; i++){
		if(grid[i] === " "){
			grid[i] = 'O';
			return grid;
		}
	}
}



module.exports = router;
