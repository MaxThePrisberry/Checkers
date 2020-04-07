var windowWidth, windowHeight, canvas, ctx, dpiratio;
var assets=[];

function onLoad() {
	resize()
	loadAssets()
	canvas = document.getElementById("canvas")
	dpiratio = window.devicePixelRatio
	ctx = canvas.getContext("2d")
	let x = windowWidth/2 - document.getElementById("middleblock").style.width/2
	document.getElementById("middleblock").style.left = x + "px"
	
	gameLoop()
}

function loadAssets() {
	assets[0] = new Image()
	assets[0].src = "wallpaper.png"
}

function resize() {
	windowWidth = window.innerWidth;
	windowHeight = window.innerHeight;
	document.getElementById("canvas").style.width = windowWidth + "px";
	document.getElementById("canvas").style.height = windowHeight + "px";
}

function gameLoop() {
	update()
	fix_dpi()
	draw()
	window.requestAnimationFrame(gameLoop)
}

function draw() {
	ctx.filter = "blur(15px)"
	ctx.drawImage(assets[0],0,0,canvas.width,canvas.height)
}

function update() {
	
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