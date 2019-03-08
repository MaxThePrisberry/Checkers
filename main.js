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

var timer = new Date();
var startTime = timer.getTime();

const resourceMap = ["Wood", "Potatoes"];//Which resources are available. Same order as the resources are stored in player

var keystates = [false,false,false,false];//If key is pressed. Left, Right, Up, and Down keys respectively

//HELPER FUNCTIONS

function withinScreen(pos,width,height) { //Returns if an object should be drawn or skipped. pos: board position, width: full width of object, height: full height of object
	return pos[0] < (player.pos[0]+canvas.width/2+width/2) && pos[0] > (player.pos[0]-canvas.width/2-width/2) && pos[1] < (player.pos[1]+canvas.height/2+height/2) && pos[1] > (player.pos[1]-canvas.height/2-height/2);
}

function toDegrees (angle) {
  return angle * (180 / Math.PI);
}

function angleFromUpInRadians(pos, target){
	return (target[0] - pos[0] < 0) ? ((Math.PI) + Math.atan((target[1] - pos[1])/(target[0] - pos[0]))):(Math.atan((target[1] - pos[1])/(target[0] - pos[0])));
}

function boardXToCanvasX(posx) { //Returns board x-position's x-coordinate on the canvas
	return canvas.width/2 + (posx-player.pos[0]);
}

function boardYToCanvasY(posy) { //Returns board y-position's y-coordinate on the canvas
	return canvas.height/2 + (posy-player.pos[1]);
}

function canvasXToBoardX(posx) {
	return player.pos[0] - canvas.width/2 + posx;
}

function canvasYToBoardY(posy) {
	return player.pos[1] - canvas.height/2 + posy;
}

function mapDistanceAway(start, finish) {
	return Math.sqrt(Math.pow(start[0] - finish[0], 2) + Math.pow(start[1] - finish[1], 2));
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

function drawSerratedCircle(pos, radius, serrates, indent, fillcolor) {
	ctx.beginPath();
	let startingX = boardXToCanvasX(pos[0]);
	let startingY = boardYToCanvasY(pos[1]);
	let moveX = startingX + Math.cos(0) * radius * indent;
	let moveY = startingY + Math.sin(0) * radius * indent;
	let shift = Math.PI/serrates;
	let totalRotation = shift;
	ctx.moveTo(moveX, moveY);
	for (let x = 0; x < serrates; x++) {
		moveX = startingX + Math.cos(totalRotation) * radius;
		moveY = startingY + Math.sin(totalRotation) * radius;
		ctx.lineTo(moveX, moveY);
		totalRotation += shift;
		moveX = startingX + Math.cos(totalRotation) * radius * indent;
		moveY = startingY + Math.sin(totalRotation) * radius * indent;
		ctx.lineTo(moveX, moveY);
		totalRotation += shift;
	}
	ctx.lineWidth = 20;
	ctx.strokeStyle = "black";
	ctx.stroke();
	ctx.fillStyle = fillcolor;
	ctx.fill();
}

//REYNOLD'S BOIDS HELPER FUNCTIONS

function ruleOne(minionNum) { //Cohesion towards player
	return vectorDivide(vectorSubtract([canvasXToBoardX(mouseLocation[0]), canvasYToBoardY(mouseLocation[1])],player.minions[minionNum].pos),100);
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
	mouseLocation[2] = angleFromUpInRadians([canvas.width/2, canvas.height/2], [event.clientX, event.clientY]);
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

function Map(width,height,trees=[new Tree([1000, 1000], 150)]) { // width: int, height: int, trees: Tree[]
	this.width = width;
	this.height = height;
	this.trees = trees;
	this.strewnItems = [];
	this.badGuys = [new Boss([300, 300], 0, 10)];
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

Map.prototype.drawItems = function() {
	for (let item of this.strewnItems) {
		item.draw();
		if (item.id == 1 && mapDistanceAway(item.pos, player.pos) <= (player.radius + 10 + item.level)){
			player.gold += 5 + (5 * item.level);
			this.strewnItems.splice(this.strewnItems.indexOf(item), 1);
		}
	}
}

Map.prototype.drawObjects = function() {
	for (let tree of this.trees) {
		tree.draw();
	}
}

Map.prototype.drawEnemies = function() {
	let tempTimer = new Date();
	if ((tempTimer.getTime() - startTime) % 1000 == 0){
		this.badGuys.push(new Boss([Math.random() * this.width, Math.random() * this.height], 0, 15));
	}
	for (let badGuy of this.badGuys) {
		badGuy.update();
		if (badGuy.health <= 0){
			badGuy.deathSequence();
			this.badGuys.splice(this.badGuys.indexOf(badGuy), 1);
		}
	}
}

//TREE

function Tree(pos,size) {
	this.pos = pos;
	this.size = size;
	this.points = Math.round((Math.random() * 4) + 7);
}

Tree.prototype.draw = function() {
	if (withinScreen(this.pos,this.size * 2,this.size * 2)) { //Only draw tree if part of it can be seen by the user
		let relative = 1;
		for (let y = 1; y <= 3; y++) {
			drawSerratedCircle(this.pos, this.size * (relative - 0.2), this.points, 0.8, "green");
			relative -= 0.3;
		}
	}
}

//ITEMS

function Item(pos, id, level){
	this.pos = pos;
	this.id = id;
	this.level = level;
}

Item.prototype.draw = function(){
	if (this.id == 1){
		if (withinScreen(this.pos, 10 + this.level, 10 + this.level)){
			ctx.beginPath();
			ctx.arc(boardXToCanvasX(this.pos[0]), boardYToCanvasY(this.pos[1]), 10 + this.level, 0, 2*Math.PI);
			ctx.closePath();
			ctx.lineWidth = 8;
			ctx.strokeStyle = 'black';
			ctx.fillStyle = 'gold';
			ctx.stroke();
			ctx.fill();
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
	this.resources = [0, 0];//Wood
	this.color = "#ffcc00";
	this.currentHealth = 100;
	this.maxHealth = 100;
	this.regen = 1;
	this.gold = 0;
}

Player.prototype.draw = function() {
	let bodyBorderWidth = 20;
	let handSizeRatio = 0.3;
	//calculate rotation
	let angleLeft = angleFromUpInRadians([canvas.width/2, canvas.height/2], [mouseLocation[0], mouseLocation[1]]) - (0.3 * Math.PI);
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
	ctx.arc(canvas.width/2 + (Math.cos(angleLeft) * this.radius), canvas.height/2 + (Math.sin(angleLeft) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.arc(canvas.width/2 + (Math.cos(angleRight) * this.radius), canvas.height/2 + (Math.sin(angleRight) * this.radius), this.radius * handSizeRatio, 0, 2*Math.PI);
	ctx.stroke();
	ctx.fill();
	
	//draw the player's minions
	for (let i=0;i<this.minions.length;i++) {
		this.minions[i].move(i);
		this.minions[i].draw();
	}
	
	if (this.currentHealth != this.maxHealth) {
		ctx.beginPath();
		ctx.fillStyle = 'red';
		ctx.lineWidth = 4;
		ctx.rect(canvas.width/2 - 50, canvas.height/2 - 90, 100, 10);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		if (this.currentHealth > 0){
			ctx.beginPath();
			ctx.fillStyle = 'green';
			ctx.rect(canvas.width/2 - 48, canvas.height/2 - 88, 96 * (this.currentHealth/this.maxHealth), 6);
			ctx.fill();
		}
		
		//REGENERATION
		this.currentHealth += ((this.currentHealth + this.regen > this.maxHealth) ? (this.maxHealth - this.currentHealth) : (this.regen))
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
	this.maxSpeed = 4;
	this.velocity = [0,0];
	this.reach = 50;
	this.attack = 1;
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

//BOSSES

function Boss(pos, type, level){
	this.pos = pos;
	this.type = type;
	this.vel = [0, 0];
	this.level = level;
	this.attacking = false;
	switch (type) {
		case 0:
			this.color = 'red';
			this.maxHealth = 1000 * this.level;
			this.health = 1000 * this.level;
			this.attack = 1 * this.level;
			this.size = 100;
			this.reach = 60;
			this.speed = 1;
			break;
		case 1: 
			this.color = 'black';
			this.maxHealth = 1000;
			this.health = 1000;
			this.attack = 20;
			this.size = 300;
			this.reach = 200;
			this.speed = 1;
			break;
		default:
			console.log("Bro that ain't a real boss type.");
	}
	this.turning = 0.5 * Math.PI;
}

Boss.prototype.draw = function(aggravated) {
	let leftHand = angleFromUpInRadians([0, 0], [Math.cos(this.turning), Math.sin(this.turning)]) - (0.3 * Math.PI);
	let rightHand = leftHand + (0.6 * Math.PI);
	switch (this.type) {
		case 0:
			if (withinScreen(this.pos, 200, 200)) {
				//draw the dude
				drawSerratedCircle(this.pos, 100, 30, 0.9, 'red');
				
				//draw the hands
				drawSerratedCircle([this.pos[0] + (Math.cos(leftHand) * 100), this.pos[1] + (Math.sin(leftHand) * 100)], (100 * 0.3), 10, 0.8, this.color);
				drawSerratedCircle([this.pos[0] + (Math.cos(rightHand) * 100), this.pos[1] + (Math.sin(rightHand) * 100)], (100 * 0.3), 10, 0.8, this.color);
			}
			break;
		case 1:
			if (withinScreen(this.pos, 600, 600)) {
				if (aggravated){
					//draw the dude
					drawSerratedCircle(this.pos, 300, 30, 0.5, "purple");

					//draw the eyes
					drawSerratedCircle([this.pos[0] - 100, this.pos[1]], (300 * 0.2), 10, 0.8, "purple");
					drawSerratedCircle([this.pos[0] + 100, this.pos[1]], (300 * 0.2), 10, 0.8, "purple");
				} else {
					//draw the dude
					drawSerratedCircle(this.pos, 300, 30, 0.5, "#00ff00");

					//draw the eyes
					drawSerratedCircle([this.pos[0] - 100, this.pos[1]], (300 * 0.2), 10, 0.8, "#00ff00");
					drawSerratedCircle([this.pos[0] + 100, this.pos[1]], (300 * 0.2), 10, 0.8, "#00ff00");
				}
			}
			break;
	}
	if (this.health != this.maxHealth) {
		ctx.beginPath();
		ctx.fillStyle = 'red';
		ctx.lineWidth = 6;
		ctx.rect(boardXToCanvasX(this.pos[0] - this.size - 30), boardYToCanvasY(this.pos[1] - this.size - 70), (this.size * 2) + 60, 20);
		ctx.fill();
		ctx.stroke();
		ctx.closePath();
		ctx.beginPath();
		ctx.fillStyle = 'green';
		ctx.rect(boardXToCanvasX(this.pos[0] - this.size - 27), boardYToCanvasY(this.pos[1] - this.size - 67), ((this.size * 2) + 54) * (this.health/this.maxHealth), 14);
		ctx.fill();
	}
}

Boss.prototype.update = function() {
	if (mapDistanceAway(this.pos, player.pos) <= this.size + player.radius + this.reach || (mapDistanceAway(this.pos, player.pos) <= this.size + player.radius + (6 * this.reach) && this.health != this.maxHealth)){
		this.attacking = true;
	} else {
		this.attacking = false;
	}
	if (this.attacking){
		if (player.currentHealth > 0 && mapDistanceAway(this.pos, player.pos) <= this.size + player.radius + this.reach) {
			player.currentHealth -= this.attack;
		}
		this.turning = angleFromUpInRadians(this.pos, player.pos);
		this.vel[0] = Math.cos(this.turning) * 100 * this.speed;
		this.vel[1] = Math.sin(this.turning) * 100 * this.speed;
		this.draw(true);
	} else {
		let tempTimer = new Date();
		if ((tempTimer.getTime() - startTime) % 3000 <= 2){
			let randAng = Math.round(Math.random() * 359);
			this.turning = randAng;
			this.vel[0] = Math.cos(randAng) * 100 * this.speed;
			this.vel[1] = Math.sin(randAng) * 100 * this.speed;
		} else if ((tempTimer.getTime() - startTime) % 3000 > 1500){
			this.vel[0] = 0;
			this.vel[1] = 0;
		}
		this.draw(false);
	}
	
	let uVector = unitVector(this.vel);
	uVector = [uVector[0]*this.speed,uVector[1]*this.speed];
	this.pos[0] += (this.pos[0]+uVector[0]>=this.size && this.pos[0]+uVector[0]<=map.width-this.size) ? uVector[0] : 0;
	this.pos[1] += (this.pos[1]+uVector[1]>=this.size && this.pos[1]+uVector[1]<=map.height-this.size) ? uVector[1] : 0;
	
	for (let k = 0; k < player.minions.length; k++){
		if (mapDistanceAway(this.pos, player.minions[k].pos) <= player.minions[k].reach + this.size){
			this.health -= player.minions[k].attack;
		}
	}
}

Boss.prototype.deathSequence = function(){
	for (let k = 0; k < this.level; k++){
		map.strewnItems.push(new Item([((Math.random() * 140) - 70 + this.pos[0]), ((Math.random() * 140) - 70 + this.pos[1])], 1, this.level));
	}
}

//STATS

function drawOverlay() {
	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.fillStyle = "#663300";
	ctx.lineWidth = 10;
	ctx.rect(canvas.width/2 - 45, canvas.height - 38, 90, 38);
	ctx.closePath();
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.strokeStyle = "black";
	ctx.fillStyle = "gold";
	ctx.lineWidth = 5;
	ctx.arc(canvas.width/2 - 25, canvas.height - 20, 12, 0, 2*Math.PI);
	ctx.closePath()
	ctx.stroke();
	ctx.fill();
	ctx.beginPath();
	ctx.font = "20px Arial";
	ctx.fillStyle = "gold";
	ctx.fillText(player.gold, canvas.width/2, canvas.height - 15);
	ctx.closePath();
}

//DRAW

function draw() {
	ctx.clearRect(0,0,canvas.width,canvas.height);
	map.drawLandscape();
	map.drawItems();
	player.move();
	player.draw();
	map.drawEnemies();
	map.drawObjects();
	drawOverlay();
}

//player.minions = [new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([980,920],"orange"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue"),new Minion([1020,880],"blue")];
//Date.getTime()
setInterval(draw,15);//Close enough to 16.666 seconds, 1000/60
