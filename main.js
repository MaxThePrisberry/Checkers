//INITIALIZE

const canvas = document.getElementById("myCanvas");

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

const ctx = canvas.getContext("2d");

const minionRadius = 15;
const minionNeighboringDistance = 2*minionRadius;//Constant used for size of circle around each Minion

var map = new Map(2000,2000);//,[new Tree([1000,1000],200)]);

var player = new Player([map.width/2,map.height/2],50,3);

var mouseLocation = [110, 0];

const resourceMap = ["Wood"];//Which resources are available. Same order as the resources are stored in player

var keystates = [false,false,false,false];//If key is pressed. Left, Right, Up, and Down keys respectively

//HELPER FUNCTIONS

function withinScreen(pos,width,height) { //Returns if an object should be drawn or skipped. pos: board position, width: full width of object, height: full height of object
	return pos[0] < (player.pos[0]+canvas.width/2+width/2) && pos[0] > (player.pos[0]-canvas.width/2-width/2) && pos[1] < (player.pos[1]+canvas.height/2+height/2) && pos[1] > (player.pos[1]-canvas.height/2-height/2);
}

function boardXToCanvasX(posx) { //Returns board x-position's x-coordinate on the canvas
	return canvas.width/2 + (posx-player.pos[0]);
}

function boardYToCanvasY(posy) { //Returns board y-position's y-coordinate on the canvas
	return canvas.height/2 + (posy-player.pos[1]);
}

function distMagnitude([xposone,yposone],[xpostwo,ypostwo]) {
	return vectorMagnitude([xpostwo-xposone,ypostwo-yposone]);
}

function unitVector([xcomponent,ycomponent]) { //Returns unit vector of given vector
	let magnitude = vectorMagnitude([xcomponent,ycomponent]);
	return (magnitude != 0) ? [xcomponent/magnitude,ycomponent/magnitude] : [0,0];
}

function vectorMagnitude([xcomponent,ycomponent]) { //Returns magnitude of given vector
	return Math.sqrt(Math.pow(xcomponent,2)+Math.pow(ycomponent,2));
}

function vectorAdd(...paramVectors) {
	let resultVector = [0,0];
	for (let i = 0; i < paramVectors.length; i++) {
		resultVector[0] += paramVectors[i][0];
		resultVector[1] += paramVectors[i][1];
	}
	return resultVector;
}

function vectorSubtract(...paramVectors) { //Second to last vectors subtracted from first vector given
	let resultVector = paramVectors[0].slice(0);//Have to use ".slice" or else this operations is copy by reference, not value. ".slice" only performs a shallow copy
	for (let i = 1; i < paramVectors.length; i++) {
		resultVector[0] -= paramVectors[i][0];
		resultVector[1] -= paramVectors[i][1];
	}
	return resultVector;
}

function vectorDivide(vector,divisor) {
	return [vector[0]/divisor,vector[1]/divisor];
}

function vectorMultiply(vector,multiplier) {
	return [vector[0]*multiplier,vector[1]*multiplier];
}

//REYNOLD'S BOIDS HELPER FUNCTIONS

function ruleOne(minionNum) { //Cohesion towards player
	return vectorDivide(vectorSubtract(player.pos,player.minions[minionNum].pos),100);
}

function ruleTwo(minionNum) { //Separation from other Minions
	let resultVector = [0,0];
	for (let i = 0; i < player.minions.length; i++) {
		if (minionNum != i && distMagnitude(player.minions[i].pos,player.minions[minionNum].pos) < minionNeighboringDistance) {
			resultVector = vectorSubtract(resultVector,vectorSubtract(player.minions[i].pos,player.minions[minionNum].pos));
		}
	}
	return resultVector;
}

//USER INPUT

function mouseMove(event) {
	mouseLocation[0] = event.clientX;
	mouseLocation[1] = event.clientY;
}

function keyPress(event) {
	let key = event.which || event.keyCode;
	if (key == 32 && player.minions.length <= 100) {
		player.minions.push(new Minion(vectorAdd(player.pos,[Math.random(),Math.random()]), "green"));
	}		
}

function keyDown(event) {
	let key = event.which || event.keyCode;
	if ((key == 37 && keystates[0]==false) || (key == 65 && keystates[0] == false)) { //Left arrow key
		player.vel[0] -= 1;
		keystates[0] = true;
	} else if ((key == 39 && keystates[1]==false) || (key == 68 && keystates[1] == false)) { //Right arrow key
		player.vel[0] += 1;
		keystates[1] = true;
	} else if ((key == 38 && keystates[2]==false) || (key == 87 && keystates[2] == false)) { //Up arrow key
		player.vel[1] -= 1;
		keystates[2] = true;
	} else if ((key == 40 && keystates[3]==false) || (key == 83 && keystates[3] == false)) { //Down arrow key
		player.vel[1] += 1;
		keystates[3] = true;
	}
}

function keyUp(event) {
	let key = event.which || event.keyCode;
	if ((key == 37 && keystates[0]==true) || (key == 65 && keystates[0] == true)) { //Left arrow key. The keystates check is left in to stop unusual movement if the user loaded the page already pressing an arrow key
		player.vel[0] += 1;
		keystates[0] = false;
} else if ((key == 39 && keystates[1]==true) || (key == 68 && keystates[1] == true)) { //Right arrow key
		player.vel[0] -= 1;
		keystates[1] = false;
	} else if ((key == 38 && keystates[2]==true) || (key == 87 && keystates[2] == true)) { //Up arrow key
		player.vel[1] += 1;
		keystates[2] = false;
	} else if ((key == 40 && keystates[3]==true) || (key == 83 && keystates[3] == true)) { //Down arrow key
		player.vel[1] -= 1;
		keystates[3] = false;
	}
}

//MAP

function Map(width,height,trees=[new Tree([1000, 1000], 300)]) { // width: int, height: int, trees: Tree[]
	this.width = width;
	this.height = height;
	this.trees = trees;
}

Map.prototype.drawLandscape = function() {
	let xcoord = (player.pos[0] >= canvas.width/2) ? 0 : canvas.width/2-player.pos[0];//Coordinate on canvas, not map
	let ycoord = (player.pos[1] >= canvas.height/2) ? 0 : canvas.height/2-player.pos[1];//Coordinate on canvas, not map
	let width = (player.pos[0]+canvas.width/2 <= this.width) ? canvas.width-xcoord : (canvas.width/2-xcoord)+(this.width-player.pos[0]);//Derived from commented code below
	let height = (player.pos[1]+canvas.height/2 <= this.height) ? canvas.height-ycoord : (canvas.height/2-ycoord)+(this.height-player.pos[1]);//Derived from commented code below
	/*EXPANDED VERSION
	let width,height;
	if(player.pos[0]+canvas.width/2<=this.width) {//If extending to right edge of the canvas
		width = canvas.width-xcoord;
	} else {
		width = (canvas.width/2-xcoord)+(this.width-player.pos[0]);
	}
	if(player.pos[1]+canvas.height/2<=this.height) {//If extending to the bottom edge of the canvas
		height = canvas.height-ycoord;
	} else {
		height = (canvas.height/2-ycoord)+(this.height-player.pos[1]);
	}*/
	ctx.fillStyle="#33cc33";
	ctx.fillRect(xcoord,ycoord,width,height);
}

Map.prototype.drawObjects = function() {
	for (let tree of this.trees) {
		tree.draw();
	}
}

//TREE

function Tree(pos,size) {
	this.pos = pos;
	this.size = size;
	this.points = Math.round((Math.random() * 4) + 7);
}

Tree.prototype.draw = function() {
	if (withinScreen(this.pos,this.size,this.size)) { //Only draw tree if part of it can be seen by the user
		let relative = 1;
		for (let y = 1; y <= 3; y++) {
			ctx.beginPath();
			let startingX = boardXToCanvasX(this.pos[0]);
			let startingY = boardYToCanvasY(this.pos[1]);
			let moveX = startingX;
			let moveY = startingY - this.size * 0.8 * (relative - 0.2);
			let shift = Math.PI/this.points;
			let totalRotation = shift;
			ctx.moveTo(moveX, moveY);
			for (let x = 0; x <= this.points; x++) {
				moveX = startingX + Math.cos(totalRotation) * this.size * relative;
				moveY = startingY + Math.sin(totalRotation) * this.size * relative;
				ctx.lineTo(moveX, moveY);
				totalRotation += shift;
				moveX = startingX + Math.cos(totalRotation) * this.size * 0.8 * relative;
				moveY = startingY + Math.sin(totalRotation) * this.size * 0.8 * relative;
				ctx.lineTo(moveX, moveY);
				totalRotation += shift;
			}
			ctx.closePath();
			ctx.lineWidth = 20;
			ctx.strokeStyle = "black";
			ctx.stroke();
			ctx.fillStyle = "green";
			ctx.fill();
			relative -= 0.3
		}
	}
}

//PLAYER

function Player(pos,radius,speed) {
	this.pos = pos;
	this.vel = [0,0];
	this.radius = radius;
	this.speed = speed;
	this.minions = [];
	this.resources = [0];//Wood
	this.color = "#ffcc00";
	this.rotation;
}

Player.prototype.draw = function() {
	let bodyBorderWidth = 20;
	let handSizeRatio = 0.3;
	//calculate rotation
	let angleLeft = (Math.atan(Math.abs(canvas.width/2 - mouseLocation[0])/Math.abs(canvas.height/2 - mouseLocation[1])) - (0.3 * Math.PI));
	let angleRight = angleLeft + (0.6 * Math.PI);
	//draw the body with a border of black
	ctx.beginPath();
	ctx.arc(canvas.width/2,canvas.height/2,this.radius,0,2*Math.PI);
	ctx.closePath();
	ctx.lineWidth = bodyBorderWidth;
	ctx.strokeStyle = "black";
	ctx.stroke();
	ctx.fillStyle = this.color;
	ctx.fill();
	
	//draw the hands
	ctx.beginPath();
	ctx.fillStyle = this.color;
	if (mouseLocation[0] >= canvas.width/2 && mouseLocation[1] <= canvas.height/2) {
		ctx.arc(canvas.width/2 + (Math.sin(angleLeft) * this.radius), canvas.height/2 - (Math.cos(angleLeft) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
		ctx.closePath();
		ctx.strokeStyle = "black";
		ctx.lineWidth = bodyBorderWidth;
		ctx.stroke();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(canvas.width/2 + (Math.sin(angleRight) * this.radius), canvas.height/2 - (Math.cos(angleRight) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);	
	} else if (mouseLocation[0] >= canvas.width/2 && mouseLocation[1] >= canvas.height/2) {
		ctx.arc(canvas.width/2 + (Math.sin(angleLeft) * this.radius), canvas.height/2 + (Math.cos(angleLeft) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
		ctx.closePath();
		ctx.strokeStyle = "black";
		ctx.lineWidth = bodyBorderWidth;
		ctx.stroke();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(canvas.width/2 + (Math.sin(angleRight) * this.radius), canvas.height/2 + (Math.cos(angleRight) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
	} else if (mouseLocation[0] <= canvas.width/2 && mouseLocation[1] >= canvas.height/2) {
		ctx.arc(canvas.width/2 - (Math.sin(angleLeft) * this.radius), canvas.height/2 + (Math.cos(angleLeft) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
		ctx.closePath();
		ctx.strokeStyle = "black";
		ctx.lineWidth = bodyBorderWidth;
		ctx.stroke();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(canvas.width/2 - (Math.sin(angleRight) * this.radius), canvas.height/2 + (Math.cos(angleRight) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
	} else if (mouseLocation[0] <= canvas.width/2 && mouseLocation[1] <= canvas.height/2) {
		ctx.arc(canvas.width/2 - (Math.sin(angleLeft) * this.radius), canvas.height/2 - (Math.cos(angleLeft) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
		ctx.closePath();
		ctx.strokeStyle = "black";
		ctx.lineWidth = bodyBorderWidth;
		ctx.stroke();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(canvas.width/2 - (Math.sin(angleRight) * this.radius), canvas.height/2 - (Math.cos(angleRight) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
	}
	ctx.strokeStyle = "black";
	ctx.lineWidth = bodyBorderWidth;
	ctx.stroke();
	ctx.fill();
	
	//draw the player's minions
	for (let i=0;i<this.minions.length;i++) {
		this.minions[i].move(i);
		this.minions[i].draw();
	}
}

Player.prototype.move = function() {
	let uVector = unitVector(this.vel);
	uVector = [uVector[0]*this.speed,uVector[1]*this.speed];
	this.pos[0] += (this.pos[0]+uVector[0]>=this.radius && this.pos[0]+uVector[0]<=map.width-this.radius) ? uVector[0] : 0;//Only apply x-movement if you stay inside the map. Derived from code below
	this.pos[1] += (this.pos[1]+uVector[1]>=this.radius && this.pos[1]+uVector[1]<=map.height-this.radius) ? uVector[1] : 0;//Only apply y-movement if you stay inside the map. Derived from code below
	/*EXPANDED VERSION
	if(this.pos[0]+uVector[0]>=this.radius && this.pos[0]+uVector[0]<=map.width-this.radius) {
		this.pos[0] += uVector[0];
	}
	if(this.pos[1]+uVector[1]>=this.radius && this.pos[1]+uVector[1]<=map.height-this.radius) {
		this.pos[1] += uVector[1];
	}*/
}

//MINIONS

function Minion(pos,color,radius=minionRadius) {
	this.pos = pos;
	this.color = color;
	this.radius = radius;
	this.maxSpeed = 2;
	this.velocity = [0,0];
}

Minion.prototype.draw = function() {
	if (withinScreen(this.pos,this.radius*2,this.radius*2)) {
		ctx.beginPath();
		ctx.fillStyle = "black";
		ctx.arc(boardXToCanvasX(this.pos[0]),boardYToCanvasY(this.pos[1]),this.radius + 5,0,2*Math.PI);
		ctx.fill();
		ctx.beginPath();
		ctx.fillStyle = "#1a75ff";
		ctx.arc(boardXToCanvasX(this.pos[0]),boardYToCanvasY(this.pos[1]),this.radius,0,2*Math.PI);
		ctx.fill();
	}
}

Minion.prototype.move = function(minionNum) { //Parameter: What the index is for this minion in player.minions
	let v1 = ruleOne(minionNum);
	let v2 = ruleTwo(minionNum);
	//let v3 = ruleThree(minionNum);
	
	this.velocity = vectorAdd(this.velocity,v1,v2);
	this.keepInMap();
	this.limitVelocity();
	this.pos = vectorAdd(this.pos,this.velocity);
}

Minion.prototype.limitVelocity = function() {
	if (vectorMagnitude(this.velocity) > this.maxSpeed) {
		this.velocity = vectorMultiply(unitVector(this.velocity),this.maxSpeed);
	}
}

Minion.prototype.keepInMap = function() {
	if (this.pos[0] < 0) {
		this.velocity[0] = 10;
	} else if (this.pos[0] > map.width) {
		this.velocity[0] = -10;
	}
	if (this.pos[1] < 0) {
		this.velocity[1] = 10;
	} else if (this.pos[1] > map.height) {
		this.velocity[1] = -10;
	}
}

//STATS

function drawStats() {
	let pos = [10,30];
	ctx.font = "30px Arial";
	ctx.fillStyle = "black";
	for (let i=0;i<resourceMap.length;i++,pos[1]+=30) {
		ctx.fillText(resourceMap[i] + ": " + player.resources[i],pos[0],pos[1]);
	}
}

//DRAW

function draw() {
	ctx.clearRect(0,0,canvas.width,canvas.height);
	map.drawLandscape();
	player.move();
	player.draw();
	map.drawObjects();
	drawStats();
}

//player.minions = [new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue")];

setInterval(draw,15);//Close enough to 16.666 seconds, 1000/60
