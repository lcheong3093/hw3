var grid = [];
var winner = " ";

//Fill in board w/ 9 empty cells
for(i = 0; i < 9; i++){
	grid.push(" ");
}

function makeMove(cell){
	//console.log("cell: " + cell + ": " + grid[cell]);
	if(grid[cell] == " "){
		grid[cell] = "X";
		serverTurn();
	}
}

function serverTurn(){
	$.ajax({
		url: "/ttt/play",
		type: "post",
        data: JSON.stringify({"grid":grid, "winner":winner}),
		contentType: "application/json",
		dataType: "json",
        success: function(data) {
			winner = data.winner;
			new_grid = data.grid;
			
			if(!boardFull(data.grid) && winner === " "){
				console.log("continue game");
			}else if(winner === " "){
				$("#winner").html("No one wins");
			}else if(winner === "X"){
				$("#winner").html("Winner: " + winner + "WOW");
			}else{
				$("#winner").html("Winner: " + winner + "gg");
			}
			
			console.log("go print board");
			
			//Update grid w/ server's turn
			updateGrid(new_grid);
        }
    });
}

function updateGrid(new_grid){	
	//Print out new board
	for (i = 0; i < 9; i++) {
        grid[i] = new_grid[i];
        $("#b" + i).attr("value", grid[i]);
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

