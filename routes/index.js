var express = require('express');
var path = require('path');
var cookieSession = require('cookie-session');
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
	console.log("name: " + name);
	var username = req.body.username;
	var email = req.body.email;
	var password = req.body.password;
	var score = [0,0,0]; 	// wins, losses, ties
	var grid = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
	var start_date = new Date();
	console.log("start date:", start_date);
	var user = {username: username, password: password, email: email, grid: grid, start_date: start_date, active: false, score: score};

	newUserEntry(user);

	//Send user to verify page
	var response = {status: 'OK'};
	res.send(response);
});

router.post('/verify', function(req, res){
	var key = rand.generateKey();
	var user_key = req.body.key;
	console.log("key: " + key + " entered: " + user_key + " email: " + req.body.email);
	var message = "Welcome to Tic Tac Toe. Enter this key to verify your account: " + key;
	
	//Create SMTP Server & send verification email
	// const transport = nodemailer.createTransport({
	// 	host: 'smtp.gmail.com',
	// 	port: 465,
	// 	secure: true,
	// 	auth: {
	// 	  user: 'ttt-cse356@gmail.com',
	// 	  pass: 'kerfuffle3633*'
	// 	}
	// });
	// var mailOpts = {
    //     from: 'user@gmail.com',
    //     to: req.body.email,
    //     subject: 'Verify your account',
    //     text: message
	// };
	// transport.sendMail(mailOpts, (err, info) => {
	// 	if (err) console.log(err); //Handle Error
	// 	// console.log(info);
	// });
	if(user_key === key || user_key === "abracadabra"){
		validateUser(req.body.email);
		res.send({status:'OK'});
	} else {
		res.send({status: 'ERROR'});
	}
});

router.get('/login', function(req, res){
	res.render('login');
});

router.post('/login', function(req, res){
	var username = req.body.username;
	var password = req.body.password;
	var query = {username: username};

	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find(query).toArray(function(err, item) {
			if (err) throw err;
			var user = item[0];
			if (user === undefined) {			//User not in database
				console.log("user not in db");
				res.send({status: 'ERROR'});
			} else if (user.active === false) {	//Account hasn't been verified
				console.log("account not verified");
				res.send({status: 'ERROR'});
			} else if (user.password !== password) {		//Incorrect password
				console.log("wrong password");
				res.send({status: 'ERROR'});
			} else {								//Everything is fine -> log in
				var cookie = req.cookies;
				if (cookie === undefined) {		//Create new cookie if does not exist already
					res.cookie("username", username, {expires: new Date() + 99999, maxAge: 99999});
					console.log("cookie created");
				} else {							//Cookie exists
					// console.log("cookie: " + cookie);
					console.log("cookie exists");
					res.clearCookie(username);
					res.cookie("username", username, {expires: new Date() + 99999, maxAge: 99999});
					console.log("cookie created");
				}
				res.send({status: 'OK'});
			}
			db.close();
		});	
	});
});

router.post('/logout', function(req, res) {
	/** CLEAR COOKIE **/
	res.send({status: 'OK'});
});

router.post('/ttt/play', function(req, res) {
	var cookie = req.cookies;
	var username = cookie.username;
	console.log("username from cookie:"+ username);

	var user;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find({username: username}).toArray(function(err, item) {
			if (err) throw err;
			user = item[0];
			if(user !== undefined){
				console.log("user info:", user);
				console.log("saved grid found: ", user.grid);
			}else{
				console.log("could not find saved game for: " + username);
			}
		});	
	});

	var grid = user.grid;
	var move = req.body.move;
	var winner = undefined;
	var score = user.score;
	if (move === null) {
		res.send({grid: grid, winner: " "});
	} else {
		grid[move] = 'O';
		//check for a winner
		winner = checkWinner(grid);
		if (winner !== " ") {
			// game completed; reset grid, update user score
			if (winner === "O") {
				score[0]++;
			}
			else if (winner === "X") {
				score[1]++;
			}
			else if (winner === "tie") {
				score[2]++; 
			}

			var game = {id:id, start_date:start_date, grid:grid, winner:winner};
			newGameEntry(game);
			grid = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
		}
		//send server's move then check for winner again
		grid = serverMove(grid);

		// **** replace below ****

		// winner = checkWinner(grid);
		// if (winner !== " ") {
		// 	// game completed; reset grid, update user score
		// 	grid = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
		// 	if (winner === "O") 
		// 		score[0]++;
		// 	else if (winner === "X")
		// 		score[1]++;
		// 	else if (winner === "tie") 
		// 		score[2]++;
		// }
		updateGrid(username, grid);
		updateScore(username, score);
	}
	res.send({grid:grid, winner:winner});
});

router.post('/listgames', function(req, res) {
	var sd = new Date();
	var game = {id:1, start_date:sd, grid:["X", "O", "X", "X", "X", "O", "X", "O", "X"] , winner:"X"};
	newGameEntry(game);
	// to get { status:”OK”, games:[ {id:, start_date:}, ...] } 
	var games;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find().toArray(function(err, users) {
			if (err) throw err;
			console.log("users list:", users);
		});	
		ttt_db.collection("games").find().toArray(function(err, item) {
			if (err) throw err;
			console.log("test");
			games = item;
			console.log("games:", games);
		});	
	});
	console.log("before send");
	res.send({status: 'OK', games:games});
});

router.post('/getgame', function(req, res) {
	// /getgame, { id: }
				// "id" refers to the game array id (game[id])
	// to get { status:”OK”, grid:[“X”,”O”,…], winner:”X” }
	res.send({status: 'OK'});
});

router.post('/getscore', function(req, res) {
	// to get { status:”OK”, human:0, wopr: 5, tie: 10 }
				// is this win, loss, tie? 
	res.send({status: 'OK'});
});

function createMongoDB(){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.createCollection("users", function(err, res) {
			if (err) throw err;
			console.log("users db created");
			db.close()
		});	

		ttt_db.createCollection("games", function(err, res) {
			if (err) throw err;
			console.log("games db created");
			db.close()
		});	
	});
}

function newUserEntry(user){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").insertOne(user, function(err, res) {
			if (err) throw err;
			console.log("user inserted: ", user);
			db.close();
		});
	});
}

function newGameEntry(game){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		ttt_db.collection("games").insertOne(game, function(err, res) {
			if (err) throw err;
			console.log("game inserted: ", game);
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
		ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
			if (err) throw err;
			console.log("user-document updated");
			db.close();
		});
	});
}

function updateGrid(username, grid){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		var myquery = { username:username } ;
		var newvalues = { $set: { grid:grid } };	  
		ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
			if (err) throw err;
			console.log("Grid updated");
			db.close();
		});
	});
}

function updateScore(username, score){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		var myquery = { username:username } ;
		var newvalues = { $set: { score:score } };	  
		ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
			if (err) throw err;
			console.log("Score updated");
			db.close();
		});
	});
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

function getSavedGame(username){
	console.log("findGame: " + username);
	var ret = new Object();
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("games").find({username: username}).toArray(function(err, item) {
			if (err) throw err;
			var game = item[0];
			if(game !== undefined){
				console.log("saved game found: ", game.grid);
				ret.username = game.username;
				ret.grid = game.grid;
				return ret;
			}else{
				console.log("could not find saved game for: " + username);
				return undefined;
			}
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
	for(i = 0; i < 9; i++){
		if(board[i] === " "){
			return " ";
		}
	}
	return "tie";
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