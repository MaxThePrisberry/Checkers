var windowWidth, windowHeight, canvas, ctx, dpiratio, ws, gameStarted, assets=[];
var enemyCheckers=[], friendlyCheckers=[];

function onLoad() {
	resize();
	loadAssets();
	canvas = document.getElementById("canvas");
	dpiratio = window.devicePixelRatio;
	ctx = canvas.getContext("2d");
	ws = new WebSocket("ws://192.168.1.85:1234");
	gameStarted = false;
	
	gameLoop();
}

function loadAssets() {
	assets[0] = new Image();
	assets[0].src = "wallpaper.png";
}

function resize() {
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	document.getElementById("canvas").style.width = windowWidth + "px";
	document.getElementById("canvas").style.height = windowHeight + "px";
	let adjustedWidth = windowWidth/2 - parseInt(document.getElementById("middleblock").style.width)/2;
	let adjustedHeight = windowHeight/2 - parseInt(document.getElementById("middleblock").style.height)/2;
	document.getElementById("middleblock").style.left = adjustedWidth + "px";
	document.getElementById("middleblock").style.top = adjustedHeight + "px";
}

function gameLoop() {
	update();
	fix_dpi();
	draw();
	window.requestAnimationFrame(gameLoop);
}

function draw() {
	if (gameStarted) {
		console.log("BBBBBB");
	} else {
		ctx.filter = "blur(15px)";
		ctx.drawImage(assets[0],0,0,canvas.width,canvas.height);
		console.log("AAAAA");
	}
}

function update() {
	
}

ws.onopen = function (event) {
	console.log("Connection established");
	ws.send("Heloooooooooooooooooo Comrade");
}
ws.onclose = function() {
	console.log("Connection closed");
}
ws.onerror = function(error) {
	console.log("Error: ", error);
}

function beginPlay() {
	console.log("connection");
	document.getElementById("middleblock").style.visibility = "hidden";
	gameStarted = true;
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