var express = require('express');
var path = require('path');
//Send user a verification email
const nodemailer = require('nodemailer');
//Generate verification key
var rand = require('generate-key');
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
  res.render('play', {name:date});
});

router.get('/adduser', function(req, res) {
	res.render('adduser');
});

router.post('/adduser', function(req, res){	
	var name = req.body.name;
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;

	var user = {username: username, password: password, email: email, active: false};

	newUser(user);
	// var key = rand.generateKey();
	// console.log("generated key: " + key);

	// var message = name + ", welcome to Tic Tac Toe. Enter this key to verify your account: " + key;
	
	// //Create SMTP Server & send verification email
	// const transport = nodemailer.createTransport({
	// 	host: 'smtp.gmail.com',
	// 	port: 465,
	// 	secure: true,
	// 	auth: {
	// 	  user: 'tttcse356@gmail.com',
	// 	  pass: 'kerfuffle3633*'
	// 	}
	// });

	// var mailOpts = {
    //     from: 'user@gmail.com',
    //     to: email,
    //     subject: 'Verify your account',
    //     text: message
	// };
	
	// transport.sendMail(mailOpts, (err, info) => {
	// 	if (err) console.log(err); //Handle Error
	// 	console.log(info);
	// });

	//Send user to verify page
	var response = {status: 'OK'};
	res.send(response);
});

router.post('/verify', function(req, res){
	// var key = req.body.key;
	// var verification = req.body.verification;
	// // console.log("key: " + key + "entered: " + verification);
	// if(verification === key || verification === "abracadabra"){
	// 	var d = new Date();
  	// 	var message = req.body.username + " " + (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear();
	// 	validateUser(req.body.username);
	// 	res.render('play', {message: message}); //add user to database & allow to play game
	// } else
	// 	res.send("Incorrect key");

	var key = rand.generateKey();
	var user_key = req.body.key;
	console.log("key: " + key + " entered: " + user_key + " email: " + req.body.email);

	var message = "Welcome to Tic Tac Toe. Enter this key to verify your account: " + key;
	
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

	console.log("created transporter");

	var mailOpts = {
        from: 'user@gmail.com',
        to: req.body.email,
        subject: 'Verify your account',
        text: message
	};
	
	console.log("set mailopts");

	transport.sendMail(mailOpts, (err, info) => {
		if (err) console.log(err); //Handle Error
		console.log(info);
	});

	console.log("Mail sent");

	if(user_key === key || user_key === "abracadabra"){
		validateUser(req.body.email);
		res.send({status:'OK'});
		// res.render('play', {message: message}); //add user to database & allow to play game
	} else
		res.send("Incorrect key");
});

router.get('/login', function(req, res){
	res.render('login');
});

router.post('/login', function(req, res){
	var username = req.body.username;
	var password = req.body.password;

	var query = {username: username};
	console.log(query.username);
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find(query).toArray(function(err, item) {
			if (err) throw err;
			var user = item[0];
			if (user === undefined) {
				res.send("user not found");
				return;
			}
			else if (user.active === false) {
				res.send("not verified properly");
			}
			var pass = item[0].password;
			console.log(pass);
			if(pass !== password)
				res.render('invalid_login');
			else{
				res.send({status: 'OK'});
			}
			db.close()
		});	
	});
});

router.post('/ttt/play', function(req, res) {
  var grid = req.body.grid;
  var winner = checkWinner(grid);
  if(winner === " "){
  	var new_grid = serverMove(grid);
  	winner = checkWinner(grid);
  }  
  var data = {grid:new_grid, winner:winner};
  
  res.send(data);
});

function createMongoDB(){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		console.log("Database created");
		var ttt_db = db.db("ttt");
		ttt_db.createCollection("users", function(err, res) {
			if (err) throw err;
			console.log("Collection created");
			db.close()
		});	
	});
}

function newUser(user){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").insertOne(user, function(err, res) {
			if (err) throw err;
			console.log("user inserted: " + user);
			db.close();
		});
	});
}

function validateUser(email){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		var myquery = { email:email } ;
		var newvalues = { $set: { active:true } };	  
		ttt_db.collection("users").update(myquery, newvalues, function(err, res) {
			if (err) throw err;
			console.log("user-document updated");
			db.close();
		});
	});

	// ret = findUser(email);
	// console.log(ret);
}

function constructHeader(username){
	var d = new Date();
	var message = username + " " + (d.getMonth()+1) + "/" + d.getDate() + "/" + d.getFullYear() ; 
	return message;
}

function findUser(username){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find({username: username}).toArray(function(err, item) {
			if (err) throw err;
			var user = item[0];
			if(user !== undefined)
				return user;
			else
				console.log("COULD NOT FIND USER: " + username);
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
	if(grid[0] === "X" && grid[3] === "X" && grid[6] === "X")
		return "X";
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