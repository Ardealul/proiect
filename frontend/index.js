const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
const FOOD_COLOUR = '#e66916';

const socket = io('https://sleepy-island-33889.herokuapp.com/');

socket.on('init', handleInit);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);

const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);


function newGame() {
  socket.emit('newGame');
  init();
}

function joinGame() {
  const code = gameCodeInput.value;
  socket.emit('joinGame', code);
  init();
}

let canvas, ctx;
let playerNumber;
let gameActive = false;

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------

var vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// all shaders have a main function
void main() {

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

var fragmentShaderSource = `#version 300 es

precision highp float;

uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = u_color;
}
`;

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));  // eslint-disable-line
    gl.deleteShader(shader);
    return undefined;
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));  // eslint-disable-line
    gl.deleteProgram(program);
    return undefined;
}

function webglContext(foodArray, player1Array, player2Array) {

    console.log("Food array:\n" + foodArray);
    console.log("Player1 array:\n" + player1Array);
    console.log("Player2 array:\n" + player2Array);

    // Get A WebGL context
    var canvas = document.getElementById("canvas");
    canvas.width = canvas.height = 600;
    var gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // create GLSL shaders, upload the GLSL source, compile the shaders
    var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link the two shaders into a program
    var program = createProgram(gl, vertexShader, fragmentShader);

    // look up where the vertex data needs to go.
    var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // look up uniform locations
    var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    var colorLocation = gl.getUniformLocation(program, "u_color");

    // Create a buffer
    var positionBuffer = gl.createBuffer();

    // Create a vertex array object (attribute state)
    var vao = gl.createVertexArray();

    // and make it the one we're currently working with
    gl.bindVertexArray(vao);

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);

    //webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // draw 50 random rectangles in random colors
    /*
    for (var ii = 0; ii < 50; ++ii) {
        // Put a rectangle in the position buffer
        setRectangle(
            gl, randomInt(300), randomInt(300), randomInt(300), randomInt(300));

        // Set a random color.
        gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);

        // Draw the rectangle.
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 6;
        gl.drawArrays(primitiveType, offset, count);
    }
    */

    var foodColor = [1.0, 0.1, 0.1, 1.0];
    var player1Color = [0.1, 1.0, 0.1, 1.0];
    var player2Color = [0.1, 0.1, 1.0, 1.0];


    //draw food

    setRectangle(gl, foodArray[0], foodArray[1]);

    gl.uniform4f(colorLocation, foodColor[0], foodColor[1], foodColor[2], foodColor[3]);
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 6;
    gl.drawArrays(primitiveType, offset, count);

    //draw player1

    for(var i = 0; i < player1Array.length; i += 2){
      setRectangle(gl, player1Array[i], player1Array[i+1]);

      gl.uniform4f(colorLocation, player1Color[0], player1Color[1], player1Color[2], player1Color[3]);
      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      gl.drawArrays(primitiveType, offset, count);
    }

    //draw player2

    for(var i = 0; i < player2Array.length; i += 2){
      setRectangle(gl, player2Array[i], player2Array[i+1]);

      gl.uniform4f(colorLocation, player2Color[0], player2Color[1], player2Color[2], player2Color[3]);
      var primitiveType = gl.TRIANGLES;
      var offset = 0;
      var count = 6;
      gl.drawArrays(primitiveType, offset, count);
    }
}

// Fill the buffer with the values that define a rectangle.
function setRectangle(gl, x, y) {
    var x1 = x;
    var x2 = x + 30;
    var y1 = y;
    var y2 = y + 30;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1, //0 , 0
        x2, y1, //20, 0
        x1, y2, //0, 20
        x1, y2, //0, 20
        x2, y1, //20, 0
        x2, y2, //20, 20
    ]), gl.STATIC_DRAW);
}

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------

function init() {
  initialScreen.style.display = "none";
  gameScreen.style.display = "block";

  //ctx.fillStyle = BG_COLOUR;
  //ctx.fillRect(0, 0, canvas.width, canvas.height);
  var foodArray = [];
  var player1Array = [];
  var player2Array = [];
  webglContext(foodArray,player1Array,player2Array);

  document.addEventListener('keydown', keydown);
  gameActive = true;
}

function keydown(e) {
  socket.emit('keydown', e.keyCode);
}

function paintGame(state) {
  //ctx.fillStyle = BG_COLOUR;
  //ctx.fillRect(0, 0, canvas.width, canvas.height);

  var foodArray = [];
  var player1Array = [];
  var player2Array = [];
  //webglContext(foodArray,player1Array,player2Array);

  const food = state.food;
  //const gridsize = state.gridsize;
  //const size = canvas.width / gridsize;
    const gridsize = state.gridsize;
    const size = 600 / gridsize;
  //ctx.fillStyle = FOOD_COLOUR;
  //ctx.fillRect(food.x * size, food.y * size, size, size);

  foodArray[0] = food.x * size;
  foodArray[1] = food.y * size;
  
  const player1 = state.players[0].snake;
  const player2 = state.players[1].snake;

  for (let cell of player1) {
    player1Array.push(cell.x * size);
    player1Array.push(cell.y * size);
  }
  for (let cell of player2) {
    player2Array.push(cell.x * size);
    player2Array.push(cell.y * size);
  }
  
  webglContext(foodArray,player1Array,player2Array);
  

  //paintPlayer(state.players[0], size, SNAKE_COLOUR);
  //paintPlayer(state.players[1], size, 'red');
}

function paintPlayer(playerState, size, colour) {
  const snake = playerState.snake;

  ctx.fillStyle = colour;
  for (let cell of snake) {
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
}

function handleInit(number) {
  playerNumber = number;
}

function handleGameState(gameState) {
  if (!gameActive) {
    return;
  }
  gameState = JSON.parse(gameState);
  requestAnimationFrame(() => paintGame(gameState));
}

function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  gameActive = false;

  if (data.winner === playerNumber) {
    alert('You Win!');
  } else {
    alert('You Lose :(');
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Unknown Game Code')
}

function handleTooManyPlayers() {
  reset();
  alert('This game is already in progress');
}

function reset() {
  playerNumber = null;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  gameScreen.style.display = "none";
}
