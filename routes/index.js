var express = require('express');
var path = require('path');
var firebase = require('firebase');
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

router.post('/ttt/addusr', function(req, res) {
	console.log("/addusr");
	
	res.render('addusr');
	
	//res.render('email_submitted', {message: message});
});


router.post('/ttt/verify', function(req, res){
	console.log("/verify");
	
	var name = req.body.name;
	var email = req.body.email;
	var password = req.body.password;
	console.log('Name: ' + name + ' Email: ' + email);
	
	var message = 'Hello, ' + name + " you've successfully created a Tic Tac Toe account! An email was sent to " + email + " with a verification key";
	
	firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
	  // Handle Errors here.
	  var errorCode = error.code;
	  var errorMessage = error.message;
	  // ...
	});
	
	var user = firebase.auth().currentUser;
	
	if(user != null){
		user.sendEmailVerification();
	}else{
		res.send("error");
	}
	
	console.log("hello");
	
	
});

router.post('/ttt/login', function(req, res){
	res.send("LOGIN");
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
