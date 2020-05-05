var windowWidth, windowHeight, canvas, ctx, dpiratio, ws, gameStarted, assets=[], mouseLocation=[], initialized;
var boardSize, topLeftW, topLeftH, squareSize;
var enemyCheckers=[[0,7,0],[2,7,0],[4,7,0],[6,7,0],[1,6,0],[3,6,0],[5,6,0],[7,6,0],[0,5,0],[2,5,0],[4,5,0],[6,5,0]], friendlyCheckers=[[1,0,0],[3,0,0],[5,0,0],[7,0,0],[0,1,0],[2,1,0],[4,1,0],[6,1,0],[1,2,0],[3,2,0],[5,2,0],[7,2,0]];
var selectedChecker = -1, possibleMoves = [], selectedMove = -1;
var buttons=[], loading=[], myName, opponentName = "Jefe", myPID, opponentPID, myTurn; 
ws = new WebSocket("ws://192.168.1.73:1234");

function onLoad() {
	resize();
	loadAssets();
	canvas = document.getElementById("canvas");
	dpiratio = window.devicePixelRatio;
	ctx = canvas.getContext("2d");
	gameStarted = false;
	document.getElementById("endblock").style.visibility = "hidden";
	initialized = false;
	
	gameLoop();
}

function loadAssets() {
	assets[0] = new Image();
	assets[0].src = "wallpaper.png";
	assets[1] = new Image();
	assets[1].src = "checkersStock.jpg";
	assets[2] = new Image();
	assets[2].src = "wood.png";
	assets[3] = new Image();
	assets[3].src = "whitetexture.png";
	assets[4] = new Image();
	assets[4].src = "browntexture.png";
	assets[5] = new Image();
	assets[5].src = "whitepiece.png";
	assets[6] = new Image();
	assets[6].src = "blackpiece.png";
	assets[7] = new Image();
	assets[7].src = "king.png";
	assets[8] = new Image();
	assets[8].src = "chalkboard.jpg";
}

function resize() {
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	document.getElementById("canvas").style.width = windowWidth + "px";
	document.getElementById("canvas").style.height = windowHeight + "px";
	let adjustedWidth = windowWidth/2 - parseInt(document.getElementById("beginblock").style.width)/2;
	let adjustedHeight = windowHeight/2 - parseInt(document.getElementById("beginblock").style.height)/2;
	document.getElementById("beginblock").style.left = adjustedWidth + "px";
	document.getElementById("beginblock").style.top = adjustedHeight + "px";
	adjustedWidth = windowWidth/2 - parseInt(document.getElementById("endblock").style.width)/2;
	adjustedHeight = windowHeight/2 - parseInt(document.getElementById("endblock").style.height)/2;
	document.getElementById("endblock").style.left = adjustedWidth + "px";
	document.getElementById("endblock").style.top = adjustedHeight + "px";
}

function gameLoop() {
	update();
	fix_dpi();
	draw();
	window.requestAnimationFrame(gameLoop);
}

function draw() {
	if (gameStarted) {
		if (canvas.width > canvas.height) {
			boardSize = 0.8 * canvas.height;
		} else {
			boardSize = 0.8 * canvas.width;
		}
		ctx.filter = "blur(5px)";
		ctx.drawImage(assets[1],0,0,canvas.width,canvas.height);
		ctx.filter = "none"
		ctx.fillStyle = "black";
		ctx.fillRect((canvas.width/2)-(boardSize/2)-3,(canvas.height/2)-(boardSize/2)-3,boardSize+6,boardSize+6);
		ctx.drawImage(assets[2],(canvas.width/2)-(boardSize/2),(canvas.height/2)-(boardSize/2),boardSize,boardSize);
		ctx.fillStyle = "black";
		ctx.fillRect((canvas.width/2)-(boardSize/2)+15,(canvas.height/2)-(boardSize/2)+15,boardSize-30,boardSize-30);
		topLeftW = (canvas.width/2)-(boardSize/2)+18;
		topLeftH = (canvas.height/2)-(boardSize/2)+18;
		squareSize = boardSize-36;
		for (let i = 0; i < 8; i++) {
			for(let c = 0; c < 4; c++) {
				if (i%2==0) {
					ctx.drawImage(assets[3],topLeftW+(squareSize/4)*c,topLeftH+(squareSize/8)*i,squareSize/8,squareSize/8);
				} else {
					ctx.drawImage(assets[3],topLeftW+(squareSize/4)*c+(squareSize/8),topLeftH+(squareSize/8)*i,squareSize/8,squareSize/8);
				}
			}
		}
		ctx.fillStyle = "white";
		for (let i = 0; i < 8; i++) {
			for(let c = 0; c < 4; c++) {
				if (i%2==0) {
					ctx.drawImage(assets[4],topLeftW+(squareSize/4)*c+(squareSize/8),topLeftH+(squareSize/8)*i,squareSize/8,squareSize/8);
				} else {
					ctx.drawImage(assets[4],topLeftW+(squareSize/4)*c,topLeftH+(squareSize/8)*i,squareSize/8,squareSize/8);
				}
			}
		}
		ctx.fillStyle = "blue";
		for (let i = 0; i < friendlyCheckers.length; i++) {
			if (selectedChecker == i) {
				ctx.filter = "invert(0.8)";
				ctx.drawImage(assets[5],topLeftW+(squareSize/8)*friendlyCheckers[i][0],topLeftH+(squareSize/8)*(7-friendlyCheckers[i][1]),squareSize/8,squareSize/8);
				ctx.filter = "none";
			} else {
				ctx.drawImage(assets[5],topLeftW+(squareSize/8)*friendlyCheckers[i][0],topLeftH+(squareSize/8)*(7-friendlyCheckers[i][1]),squareSize/8,squareSize/8);
			}
			if (friendlyCheckers[i][2] == 1) {
				ctx.drawImage(assets[7],topLeftW+(squareSize/8)*friendlyCheckers[i][0]+(squareSize/32),topLeftH+(squareSize/8)*(7-friendlyCheckers[i][1])+(squareSize/32),squareSize/16,squareSize/16);
			}
		}
		for (let i = 0; i < enemyCheckers.length; i++) {
			ctx.drawImage(assets[6],topLeftW+(squareSize/8)*enemyCheckers[i][0],topLeftH+(squareSize/8)*(7-enemyCheckers[i][1]),squareSize/8,squareSize/8);
			if (enemyCheckers[i][2] == 1) {
				ctx.filter = "invert(1)";
				ctx.drawImage(assets[7],topLeftW+(squareSize/8)*enemyCheckers[i][0]+(squareSize/32),topLeftH+(squareSize/8)*(7-enemyCheckers[i][1])+(squareSize/32),squareSize/16,squareSize/16);
				ctx.filter = "none";
			}
		}
		for (let i = 0; i < possibleMoves.length; i++) {
			ctx.filter = "opacity(50)";
			if (selectedMove == i) {
				ctx.fillStyle = "orange";
				ctx.fillRect(topLeftW+(squareSize/8)*possibleMoves[i][0],topLeftH+(squareSize/8)*(7-possibleMoves[i][1]),squareSize/8,squareSize/8);
			} else {
				ctx.fillStyle = "yellow";
				ctx.fillRect(topLeftW+(squareSize/8)*possibleMoves[i][0],topLeftH+(squareSize/8)*(7-possibleMoves[i][1]),squareSize/8,squareSize/8);
			}
			ctx.filter = "none";
		}
		
		
		
		//Draw Buttons
		buttons[0] = [topLeftW + squareSize - 100, canvas.height*0.925, 100, canvas.height*0.05, false];
		if (selectedMove != -1) {
			buttons[0][4] = true;
		}
		for (let i = 0; i < buttons.length; i++) {
			ctx.fillStyle = "black";
			ctx.fillRect(buttons[i][0]-3, buttons[i][1]-3, buttons[i][2]+6, buttons[i][3]+6);
			if (buttons[i][4]==false) {
				ctx.fillStyle = "grey";
			} else {
				ctx.fillStyle = "white";
			}
			ctx.fillRect(buttons[i][0], buttons[i][1], buttons[i][2], buttons[i][3]);
			ctx.fillStyle = "black";
			ctx.font = "15px Arial";
			ctx.textAlign = "center";
			ctx.fillText("Make Move", Math.round(buttons[0][0]+50), Math.round(buttons[0][1]+canvas.height*0.025+5));
		}
		
		
		//Draw name and score
		ctx.font = "30px Arial";
		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.drawImage(assets[8], (canvas.width/2)-(ctx.measureText(opponentName).width/2)-25, canvas.height*0.025, ctx.measureText(opponentName).width+50, canvas.height*0.05);
		ctx.fillText(opponentName, canvas.width/2, canvas.height*0.05+10)
		
		//Draw Loading Thing
		loading = [loading[0],(canvas.width/2)-150,(canvas.height/2)-25,300,50,loading[5],loading[6]];
		if (loading[0]) {
			ctx.fillStyle = "black";
			ctx.fillRect(loading[1]-3,loading[2]-3,loading[3]+6,loading[4]+6);
			ctx.fillStyle = "grey";
			ctx.drawImage(assets[8],loading[1],loading[2],loading[3],loading[4]);
			ctx.fillStyle = "white";
			ctx.font = "30px Arial";
			ctx.textAlign = "left";
			let waiting = "Waiting";
			if (loading[5]<25) {
				waiting = waiting.concat('.');
			} else if (loading[5]<50) {
				waiting = waiting.concat('..');
			} else if (loading[5]<75) {
				waiting = waiting.concat('...');
			} else if (loading[5]<100) {
				waiting = waiting.concat('....');
			}
			ctx.fillText(waiting, loading[1]+10, (canvas.height/2)+10);
			ctx.fillStyle = "white";
			let y = 20*Math.sin((Math.PI*loading[5])/50);
			ctx.arc(loading[1]+(loading[3]/2)+loading[5],loading[2]+(loading[4]/2)+y,5,0,2*Math.PI);
			ctx.fill();
			y = 20*Math.sin((Math.PI*(loading[5]-15))/50);
			ctx.arc(loading[1]+(loading[3]/2)+loading[5],loading[2]+(loading[4]/2)+y,5,0,2*Math.PI);
			ctx.fill();
			y = 20*Math.sin((Math.PI*(loading[5]-30))/50);
			ctx.arc(loading[1]+(loading[3]/2)+loading[5],loading[2]+(loading[4]/2)+y,5,0,2*Math.PI);
			ctx.fill();
			if (loading[6]){
				loading[5]++;
			} else {
				loading[5] = loading[5]-1;
			}
			if(loading[5]>145) {
				loading[6]=false;
			} else if (loading[5]<0) {
				loading[6] = true;
			}
		}
	} else {
		ctx.filter = "blur(15px)";
		ctx.drawImage(assets[0],0,0,canvas.width,canvas.height);
	}
}

function onClick(event) {
	mouseLocation[0] = event.clientX;
	mouseLocation[1] = event.clientY;
	if (gameStarted && !loading[0] && (mouseLocation[0]>topLeftW) && (mouseLocation[0]<(topLeftW+squareSize)) && (mouseLocation[1]>topLeftH) && (mouseLocation[1]<(topLeftH+squareSize))) {
		let tileClicked = [Math.floor((mouseLocation[0]-topLeftW)/(squareSize/8)),Math.floor(8-((mouseLocation[1]-topLeftH)/(squareSize/8)))];
		let thingClicked = false;
		for (let i = 0; i < friendlyCheckers.length; i++) {
			if (friendlyCheckers[i][0] == tileClicked[0] && friendlyCheckers[i][1] == tileClicked[1]) {
				if (selectedChecker == i) {
					selectedChecker = -1;
				} else {
					selectedChecker = i;
				}
				selectedMove = -1;
				thingClicked = true;
			}
		}
		for (let i = 0; i < possibleMoves.length; i++) {
			if (possibleMoves[i][0] == tileClicked[0] && possibleMoves[i][1] == tileClicked[1]) {
				selectedMove = i;
				thingClicked = true;
			}
		}
		if (!thingClicked) {
			selectedChecker = -1;
			selectedMove = -1;
		}
		possibleMoves=[];
		if (selectedChecker != -1) {
			findPossibleMoves([friendlyCheckers[selectedChecker][0],friendlyCheckers[selectedChecker][1],[]], friendlyCheckers[selectedChecker][2], false);
		}
	} else if (gameStarted && !loading[0] && (mouseLocation[0]>buttons[0][0]) && (mouseLocation[0]<buttons[0][0]+buttons[0][2]) && (mouseLocation[1]>buttons[0][1]) && (mouseLocation[1]<buttons[0][1]+buttons[0][3])) {
		let deletedCheckers = "";
		friendlyCheckers[selectedChecker][0]=possibleMoves[selectedMove][0];
		friendlyCheckers[selectedChecker][1]=possibleMoves[selectedMove][1];
		if (possibleMoves[selectedMove][2].length != 0) {
			possibleMoves[selectedMove][2].sort(function(a,b){return b - a});
		}
		console.log(possibleMoves);
		for (let i =0; i < possibleMoves[selectedMove][2].length; i++) {
			deletedCheckers = deletedCheckers.concat("["+enemyCheckers[possibleMoves[selectedMove][2][i]][0]+","+enemyCheckers[possibleMoves[selectedMove][2][i]][1]+","+enemyCheckers[possibleMoves[selectedMove][2][i]][2]+"]");
			if (i!=possibleMoves[selectedMove][2].length-1) {
				deletedCheckers = deletedCheckers.concat(",");
			}
			enemyCheckers.splice(possibleMoves[selectedMove][2][i],1);
		}
		if (friendlyCheckers[selectedChecker][1]==7 && friendlyCheckers[selectedChecker][2]==0) {
			friendlyCheckers[selectedChecker][2] = 1;
		}
		possibleMoves=[];
		selectedChecker=-1;
		selectedMove=-1;
		
		let checkerString = "";
		for (let i = 0; i < friendlyCheckers.length; i++) {
			checkerString = checkerString.concat("["+friendlyCheckers[i][0]+","+friendlyCheckers[i][1]+","+friendlyCheckers[i][2]+"]");
			if (i!=friendlyCheckers.length-1) {
				checkerString = checkerString.concat(",");
			}
		}
		console.log('{"PID":"'+myPID+'","Name":"'+myName+'","MC":['+checkerString+'],"SC":['+deletedCheckers+']}');
		ws.send('{"PID":"'+myPID+'","Name":"'+myName+'","MC":['+checkerString+'],"SC":['+deletedCheckers+']}');
		loading[0]=true;
	}
}

function findPossibleMoves(place, king, rejump) {
	if (!rejump) {
		if ((place[0]>0) && (place[1]<7)){
			if (!isTileOccupied([(place[0]-1),(place[1]+1)])) {
				possibleMoves.push([place[0]-1,place[1]+1,place[2]]);
			} else if (isEnemyChecker([(place[0]-1),(place[1]+1)]) != -1 && (place[0]>1) && (place[1]<6)) {
				if (!isTileOccupied([(place[0]-2),(place[1]+2)])) {
					let copy = place[2].slice(0);
					copy.push(isEnemyChecker([(place[0]-1),(place[1]+1)]));
					possibleMoves.push([place[0]-2,place[1]+2,copy]);
					findPossibleMoves([place[0]-2,place[1]+2,copy], king, true);
				}
			}
		}
		if ((place[0]<7) && (place[1]<7)){
			if (!isTileOccupied([(place[0]+1),(place[1]+1)])) {
				possibleMoves.push([place[0]+1,place[1]+1,place[2]]);
			} else if (isEnemyChecker([(place[0]+1),(place[1]+1)]) != -1 && (place[0]<6) && (place[1]<6)) {
				if (!isTileOccupied([(place[0]+2),(place[1]+2)])) {
					let copy = place[2].slice(0);
					copy.push(isEnemyChecker([(place[0]+1),(place[1]+1)]));
					possibleMoves.push([place[0]+2,place[1]+2,copy]);
					findPossibleMoves([place[0]+2,place[1]+2,copy], king, true);
				}
			}
		}
		if (king) {
			if ((place[0]>0) && (place[1]>0)){
				if (!isTileOccupied([(place[0]-1),(place[1]-1)])) {
					possibleMoves.push([place[0]-1,place[1]-1,place[2]]);
				} else if (isEnemyChecker([(place[0]-1),(place[1]-1)]) != -1 && (place[0]>1) && (place[1]>1)) {
					if (!isTileOccupied([(place[0]-2),(place[1]-2)])) {
						let copy = place[2].slice(0);
						copy.push(isEnemyChecker([(place[0]-1),(place[1]-1)]));
						possibleMoves.push([place[0]-2,place[1]-2,copy]);
						findPossibleMoves([copy[0]-2,copy[1]-2,copy], king, true);
					}
				}
			}
			if ((place[0]<7) && (place[1]>0)){
				if (!isTileOccupied([(place[0]+1),(place[1]-1)])) {
					possibleMoves.push([place[0]+1,place[1]-1,place[2]]);
				} else if (isEnemyChecker([(place[0]+1),(place[1]-1)]) != -1 && (place[0]<6) && (place[1]>1)) {
					if (!isTileOccupied([(place[0]+2),(place[1]-2)])) {
						let copy = place[2].slice(0);
						copy.push(isEnemyChecker([(place[0]+1),(place[1]-1)]));
						possibleMoves.push([place[0]+2,place[1]-2,copy]);
						findPossibleMoves([copy[0]+2,copy[1]-2,copy], king, true);
					}
				}
			}
		}
	} else {
		if ((place[0]>1) && (place[1]<6)){
			if (isEnemyChecker([(place[0]-1),(place[1]+1)]) != -1) {
				if (!isTileOccupied([(place[0]-2),(place[1]+2)]) && !isPossibleMove([(place[0]-2),(place[1]+2)])) {
					let copy = place[2].slice(0);
					copy.push(isEnemyChecker([(place[0]-1),(place[1]+1)]));
					possibleMoves.push([place[0]-2,place[1]+2,copy]);
					findPossibleMoves([copy[0]-2,copy[1]+2,copy], king, true);
				}
			}
		}
		if ((place[0]<6) && (place[1]<6)){
			if (isEnemyChecker([(place[0]+1),(place[1]+1)]) != -1) {
				if (!isTileOccupied([(place[0]+2),(place[1]+2)]) && !isPossibleMove([(place[0]+2),(place[1]+2)])) {
					let copy = place[2].slice(0);
					copy.push(isEnemyChecker([(place[0]+1),(place[1]+1)]));
					possibleMoves.push([place[0]+2,place[1]+2,copy]);
					findPossibleMoves([copy[0]+2,copy[1]+2,copy], king, true);
				}
			}
		}
		if (king) {
			if ((place[0]>1) && (place[1]>1)){
				if (isEnemyChecker([(place[0]-1),(place[1]-1)]) != -1) {
					if (!isTileOccupied([(place[0]-2),(place[1]-2)]) && !isPossibleMove([(place[0]-2),(place[1]-2)])) {
						let copy = place[2].slice(0);
						copy.push(isEnemyChecker([(place[0]-1),(place[1]-1)]));
						possibleMoves.push([place[0]-2,place[1]-2,copy]);
						findPossibleMoves([copy[0]-2,copy[1]-2,copy], king, true);
					}
				}
			}
			if ((place[0]<6) && (place[1]>1)){
				if (isEnemyChecker([(place[0]+1),(place[1]-1)]) != -1) {
					if (!isTileOccupied([(place[0]+2),(place[1]-2)]) && !isPossibleMove([(place[0]+2),(place[1]-2)])) {
						let copy = place[2].slice(0);
						copy.push(isEnemyChecker([(place[0]+1),(place[1]-1)]));
						possibleMoves.push([place[0]+2,place[1]-2,copy]);
						findPossibleMoves([copy[0]+2,copy[1]-2,copy], king, true);
					}
				}
			}
		}
	}
}

function isTileOccupied(place) {
	let occupied = false;
	for (let i = 0; i < friendlyCheckers.length; i++) {
		if ((place[0]==friendlyCheckers[i][0]) && (place[1]==friendlyCheckers[i][1])) {
			occupied = true;
		}
	}
	for (let i = 0; i < enemyCheckers.length; i++) {
		if ((place[0]==enemyCheckers[i][0]) && (place[1]==enemyCheckers[i][1])) {
			occupied = true;
		}
	}
	return occupied;
}
function isEnemyChecker(place) {
	let enemyChecker = -1;
	for (let i = 0; i < enemyCheckers.length; i++) {
		if ((place[0]==enemyCheckers[i][0]) && (place[1]==enemyCheckers[i][1])) {
			enemyChecker = i;
		}
	}
	return enemyChecker;
}
function isPossibleMove(place) {
	let possibleMove = false;
	for (let i = 0; i < possibleMoves.length; i++) {
		if ((place[0]==possibleMoves[i][0]) && (place[1]==possibleMoves[i][1])) {
			possibleMove = true;
		}
	}
	return possibleMove;
}

function onMouseMove(event) {
	mouseLocation[0] = event.clientX;
	mouseLocation[1] = event.clientY;
}

function update() {
	
}

ws.onopen = function (event) {
	console.log("Connection established with server.");
	initialized = true;
}
ws.onclose = function() {
	console.log("Connection closed with server.");
}
ws.onmessage = function(message) {
	console.log(message.data);
	let data = message.data;
	data = data.trim();
	data = JSON.parse(data);
	try {
		if (data.PID != myPID && data.PID != null && myPID != undefined) {
			throw new Error('Leroy has changed the PID. What is that boy doing?!');
		}
		myPID = data.PID;
	} catch (err) {}
	try {
		if (data.Name) {
			opponentName = data.Name;
		}
	} catch (err){}
	try {
		if (data.fC) {
			friendlyCheckers = data.fC;
		}
	} catch (err){}
	try {
		if (data.eC) {
			enemyCheckers = data.eC;
		}
	} catch (err){}
	try {
		switch (data.Code) {
			case 0://Not My Turn
				myTurn = false;
				break;
			case 1://My Turn
				myTurn = true;
				break;
			case 2://I Win
				endPlay("You have won the game!");
				break;
			case 3://I Lose
				endPlay("You have lost the game. Big Sad imminent.");
				break;
			case 4://Disconnect
				endPlay("Your opponent was too intimidated. Win by default.");
				break;
			default:
				throw new Error('Leroy decided to send us an invalid code. Possible wallhacks?');
		}
	} catch (err){}
	
	loading[0]=((myTurn==true)?(false):(true));
}
ws.onerror = function(error) {
	console.log("Error: ", error);
}

function beginPlay() {
	if (initialized) {
		console.log("Game Initiated");
		document.getElementById("beginblock").style.visibility = "hidden";
		gameStarted = true;
		loading = [true,0,0,0,0,0,true];
		myName=document.getElementById("nameinput").value;
		let checkerString = "";
		for (let i = 0; i < friendlyCheckers.length; i++) {
			checkerString = checkerString.concat("["+friendlyCheckers[i][0]+","+friendlyCheckers[i][1]+","+friendlyCheckers[i][2]+"]");
			if (i!=friendlyCheckers.length-1) {
				checkerString = checkerString.concat(",");
			}
		}
		console.log('{"PID":"'+myPID+'","Name":"'+myName+'","MC":['+checkerString+'],"SC":[]}');
		ws.send('{"PID":"'+myPID+'","Name":"'+myName+'","MC":['+checkerString+'],"SC":[]}');
	} else {
		alert("Still connecting with server. Please wait...");
	}
}

function endPlay(message) {
	document.getElementById("endblock").style.visibility = "visible";
	document.getElementById("endmessage").innerHTML = message;
}

function restartPlay() {
	console.log("Game Restarted");
	document.getElementById("endblock").style.visibility = "hidden";
	enemyCheckers=[[0,7,0],[2,7,0],[4,7,0],[6,7,0],[1,6,0],[3,6,0],[5,6,0],[7,6,0],[0,5,0],[2,5,0],[4,5,0],[6,5,0]];
	friendlyCheckers=[[1,0,0],[3,0,0],[5,0,0],[7,0,0],[0,1,0],[2,1,0],[4,1,0],[6,1,0],[1,2,0],[3,2,0],[5,2,0],[7,2,0]];
	let checkerString = "";
	for (let i = 0; i < friendlyCheckers.length; i++) {
		checkerString = checkerString.concat("["+friendlyCheckers[i][0]+","+friendlyCheckers[i][1]+","+friendlyCheckers[i][2]+"]");
		if (i!=friendlyCheckers.length-1) {
			checkerString = checkerString.concat(",");
		}
	}
	loading[0] = true;
	ws.send('{"PID":"'+myPID+'","Name":"'+myName+'","MC":['+checkerString+'],"SC":[]}');
}

function fix_dpi() {
	let style = {
		height() {
			return +getComputedStyle(canvas).getPropertyValue('height').slice(0,-2);
		},
		width() {
			return +getComputedStyle(canvas).getPropertyValue('width').slice(0,-2);
		}
	}
	canvas.setAttribute('width', style.width() * dpiratio);
	canvas.setAttribute('height', style.height() * dpiratio);
}
