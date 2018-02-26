var grid = [];
var winner = " ";

//Fill in board w/ 9 empty cells
for(i = 0; i < 9; i++){
	grid.push(" ");
}
console.log(grid[6]);

function makeMove(cell){
	console.log("cell: " + cell + ": " + grid[cell]);
	if(grid[cell] == " "){
		grid[cell] = "X";
		serverTurn();
	}
}

function serverTurn(){
	console.log("send to server");
	$.ajax({
		url: "/ttt/play",
		type: "post",
        data: JSON.stringify({"grid":grid, "winner":winner}),
		contentType: "application/json",
		dataType: "json",
        success: function(data) {
			winner = data.winner;
			if(winner === " " && boardFull(data.grid)){
				$("#winner").html("No one wins");
			}else{
				$("#winner").html("Winner: " + winner);
			}
			console.log("go print board");
			//Update grid w/ server's turn
			updateGrid(data["grid"]);
        }
    });
}

function updateGrid(board){
	console.log("print grid");
	//Print out new board
	for (i = 0; i < 9; i++) {
        grid[i] = board[i];
        $("#b" + i).html(grid[i]);
    }
}

function boardFull(board){
	for(i = 0; i < 9; i++){
		if(board[i] === " "){
			return false;
		}
	}
	
	return true;
}
function checkWinner(board){
	console.log("checking");
	return " ";
}
/*
function makeMove(cell){
	if (document.getElementById(cell).innerHTML !== " ") {
		//Box isn't empty
    }else if(winner != " "){
		//already a winner
	}else{
		grid[cell] = "X";
		
		updateGame();
	}
}

function updateGame(){
	$.ajax({
		url: "/ttt/play",
		type: "post",
        data: JSON.stringify({"grid":grid}),
		contentType: "application/json",
		dataType: "json",
        success: function(data) {
            printGrid(data['grid']);
       
        }
    });
}

function printGrid(updated){
	
}
*/
	

