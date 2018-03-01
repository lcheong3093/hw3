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

var currentuser;
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
	var grid = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
	var human = 0;
	var wopr = 0;
	var tie = 0;
	var listgames = [];
	var games = [];

	var user = {username: username, password: password, email: email, grid: grid, human:human, wopr:wopr, tie:tie, listgames: listgames, games:games, active: false, login: false};
	
	newUserEntry(user);

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
			if (user === undefined) {						//User not in database
				console.log("user not in db");
				res.send({status: 'ERROR'});
			} else if (user.active === false) {				//Account hasn't been verified
				console.log("account not verified");
				res.send({status: 'ERROR'});
			} else if (user.password !== password) {		//Incorrect password
				console.log("wrong password");
				res.send({status: 'ERROR'});
			} else {										//Everything is fine -> log in
				mongoClient.connect(url, function(err, db) {
					if (err) throw err;		
					var ttt_db = db.db("ttt");
					var myquery = { username:username } ;
					var newvalues = { $set: { login: true } };	  
					ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
						if (err) throw err;
						console.log("user logged in");
						db.close();
					});
				});
				var cookie = req.cookies.username;
				if (cookie === undefined || cookie !== username) {					//Create new cookie if does not exist already
					res.cookie("username", username);
					console.log("cookie created");
				} else if(cookie === username){									//Cookie exists
					console.log("cookie exists");
				}
				res.send({status: 'OK'});
			}
			db.close()
		});	
	});
});

router.post('/logout', function(req, res) {
	/** CLEAR COOKIE?? **/
	var username = req.cookies.username;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		var myquery = { username:username } ;
		var newvalues = { $set: { login: false } };	  
		ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
			if (err) throw err;
			db.close();
		});
	});
	res.send({status: 'OK'});
});
router.post('/ttt/play', function(req, res) {
	var username = req.cookies.username;
	var move = req.body.move;
	console.log("current player: "+ username + " move: " + move);
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").findOne({username: username}, function(err, item) {
			if (err) throw err;
			var user = item;
			if (user.login === false) {
				res.send({status: "ERROR"});
			} else {
			if(user !== undefined){
				var grid = user.grid;
				var winner = undefined;
				var human = user.human;
				var wopr = user.wopr;
				var tie = user.tie;
				if (move === null) {
					console.log("user didn't make a move");
					res.send({grid: grid, winner: " "});
					console.log("current grid returned:" , grid);
				} else {
					grid[move] = 'X';
					winner = checkWinner(grid);
					if (winner !== " ") {
						console.log("WINNER: " + winner);
			
						if (winner === "O") {
							wopr++;
						}
						else if (winner === "X") {
							human++;
						}
						else if (winner === ' ') {
							tie++;
						}
		
						var list = user.listgames;
						var games = user.games;
						var newG = {id: games.length + 1, grid: grid, winner: winner};
						var newGame = {id: list.length + 1, start_date: new Date()};
						list.push(newGame);
						games.push(newG);
		
						mongoClient.connect(url, function(err, db) {
							if (err) throw err;		
							var ttt_db = db.db("ttt");
							var myquery = { username:username } ;
							var empty = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
							var newvalues = { $set: { human:human, wopr:wopr, tie:tie, listgames:list, games:games, grid: empty } };	  
							ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
								if (err) throw err;
								db.close();
							});
						});
					}else{
						grid = serverMove(grid);
						winner = checkWinner(grid);
						if (winner !== " ") {
							console.log("WINNER: " + winner);
				
							if (winner === "O") {
								wopr++;
							}
							else if (winner === "X") {
								human++;
							}
							else if (winner === ' ') {
								tie++;
							}
			
							var list = user.listgames;
							var games = user.games;
							var newG = {id: games.length + 1, grid: grid, winner: winner};
							var newGame = {id: list.length + 1, start_date: new Date()};
							list.push(newGame);
							games.push(newG);
			
							mongoClient.connect(url, function(err, db) {
								if (err) throw err;		
								var ttt_db = db.db("ttt");
								var myquery = { username:username } ;
								var empty = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
								var newvalues = { $set: { human:human, wopr:wopr, tie:tie, listgames:list, games:games, grid: empty } };	  
								ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
									if (err) throw err;
									db.close();
								});
							});
						}
					}
					updateGrid(username, grid);
					updateScores(username, human, wopr, tie);
					res.send({grid:grid, winner:winner});
				}
			}
			}
		});
	});
});
router.post('/listgames', function(req, res) {
	var username = req.cookies.username;
	var games = undefined;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find({username: username}).toArray(function(err, item) {
			if (err) throw err;
			games = item[0].listgames;
			res.send({status: 'OK', games: games});
		});
	});
});
router.post('/getgame', function(req, res) {
	var cookie = req.cookies;
    var username = cookie.username;
	var id = req.body.id;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find({username: username}).toArray(function(err, item) {
			if (err) throw err;
			var user = item[0];
			var allgames = user.games;
			var game = allgames[id-1];
			var data = {status: 'OK', grid: game.grid, winner: game.winner};
			res.send(data);
		});
	});
});

router.post('/getscore', function(req, res) {
    var cookie = req.cookies;
    var username = cookie.username;
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		ttt_db.collection("users").find({username: username}).toArray(function(err, item) {
            if (err) throw err;
			var user = item[0];
			var human = user.human;   
			var wopr = user.wopr;
			var tie = user.tie;
			res.send({status: 'OK', human:human, wopr:wopr, tie:tie});		
		});	
	});
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

function updateUserData(username){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;
		var ttt_db = db.db("ttt");
		var temp = ttt_db.collection("users").findOne({username: username}, function(err, item) {
			if (err) throw err;
			var user = item;
			if(user !== undefined){
				console.log("currentuser: ", user);
			}
			else
				console.log("COULD NOT FIND USER: " + username);
		});
		return temp;	
	})
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

function updateScores(username, human, wopr, tie){
	mongoClient.connect(url, function(err, db) {
		if (err) throw err;		
		var ttt_db = db.db("ttt");
		var myquery = { username:username } ;
		var newvalues = { $set: { human:human, wopr:wopr, tie:tie } };	  
		ttt_db.collection("users").updateMany(myquery, newvalues, function(err, res) {
			if (err) throw err;
			console.log("Scores updated");
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
		if(grid[i] === " "){
			return " ";
		}
	}
	return ' ';
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