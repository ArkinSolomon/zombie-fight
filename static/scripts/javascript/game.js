//Creates server contact function
var socket = io();

//Keeps entities local and easier to access
var entities = {};

//Stores socket id
var thisSocket;

//Stores map
var map;

//Checks if player is dead
var dead = false;

/* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Keeps track of which keys are pressed
var movement = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
  q: false,
  e: false
}

/* Checks for key presses */

//Key press
document.addEventListener('keydown', function(event){
  switch (event.keyCode){
    case 65: //A
      movement.left = true;
      break;
    case 87: //W
      movement.up = true;
      break;
    case 68: //D
      movement.right = true;
      break;
    case 83: //S
      movement.down = true;
      break;
    case 16: //[ shift ]
      movement.shift = true;
      break;
    case 69: //Q
      movement.q = true;
      break;
    case 81: //E
      movement.e = true;
      break;
  }
});

//Key release
document.addEventListener('keyup', function(event){
  switch (event.keyCode){
    case 65: //A
      movement.left = false;
      break;
    case 87: //W
      movement.up = false;
      break;
    case 68: //D
      movement.right = false;
      break;
    case 83: //S
      movement.down = false;
      break;
    case 16: //[ shift ]
      movement.shift = false;
      break;
  }
});

/* End checks for key presses */

//Sends new player command to server
socket.emit('new player');

//Checks if player is dead
socket.on('dead', function(id){

  //Checks if socket id is this client's socket id
  if (id === thisSocket){

    //Sets player to dead
    dead = true;
  }
});

//Gets initial message
socket.on('get socket', function(data){

  //Gets socket id
  thisSocket = data.socketId;

  //Gets map
  map = JSON.parse(data.map);
  render(map, ctx);
});

//Checks for movement
setInterval(function(){
  socket.emit('movement', movement);
}, 1000 / 60);

//Checks for health kit
setInterval(function(){
  if (movement.e){
    socket.emit('healthKit', thisSocket);
    movement.e = false;
  }
});

//Checks for bandage
setInterval(function(){
  if (movement.q){
    socket.emit('bandage', thisSocket);
    movement.q = false;
  }
});

//Canvas declaration
var canvas = document.getElementById('canvas');
canvas.width = 960;
canvas.height = 900;
var ctx = canvas.getContext('2d');

//Runs on update from server
socket.on('update', function(d){

  //Simplifies entities
  entities = d.entities;

  //Writes ping
  const ping = new Date().getTime() - d.time.ms;
  document.getElementById('ping').innerHTML = '';
  document.getElementById('ping').innerHTML = ping;

  //Renders map
  render(map, ctx);

  //Draws health bar
  ctx.strokeStyle = 'black';
  ctx.rect(10, 10, 100, 10);

  /* Item counters */

  let counterBandage = new bandage({
    x: 35,
    y: 860,
  }, circle, ctx, 3);

  let counterHealthKit = new healthKit({
    x: 100,
    y: 860,
  }, ctx, 3);

  /* End item counters */

  //Loops through items
  for (let i in entities.items){
    var item = entities.items[i];
    spawnItem(item, ctx);
  }

  //Loops through players
  for (let id in entities.players){
    var player = new user(entities.players[id], circle, ctx);
    player.draw();
  }

  //Loops through zombies
  for (let zomb in entities.zombies){
    var zombie = new enemy(entities.zombies[zomb], circle, ctx);
    zombie.draw();
  }

  //Checks if players are dead
  if (Object.keys(entities.players).indexOf(thisSocket) === -1 || dead){

    //Draws death screen
    deathScreen(ctx, canvas);
  }else{

    //Updates health
    updateHealth(ctx);

    /* Text styling */

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';

    /* End text styling */

    //Item amount text
    ctx.fillText(entities.players[thisSocket].items.healthKit, 35, 830);
    ctx.fillText(entities.players[thisSocket].items.bandage, 100, 830);
    counterHealthKit.draw();
    counterBandage.draw();
  }
});

//Updates the health
function updateHealth(ctx){

  /* Color styling */

  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'black';

  /* End color styling */

  //Border
  ctx.rect(10, 10, 100, 10);
  ctx.stroke();
  ctx.fillRect(11, 11, getHealthLength(entities.players[thisSocket].health), 8);

  /* Text styling */

  ctx.fillStyle = 'white';
  ctx.font = '9px Arial';

  /* End text styling */

  //Text
  ctx.fillText(entities.players[thisSocket].health, 20, 18);
}

//Returns percentage of health to fill
function getHealthLength(health){
  if (health < 98){
    return health;
  }else{
    return 98;
  }
}

//Draws an item
function spawnItem(item, ctx){

  //Creates a circle
  circle(item.x, item.y, 14, 'rgba(0, 0, 0, .45)', 'black', ctx);

  //Checks item and draws the item based on its type
  if (item.item === 'bandage'){
    let bd = new bandage(item, circle, ctx);
    bd.draw();
  }else if (item.item === 'healthKit'){
    let hk = new healthKit(item, ctx);
    hk.draw()
  }
}

//Draws a circle
function circle(x, y, r, fill, stroke, ctx){

  /* Color styling */

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;

  /* End color styling */

  //Draws circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);

  //Fills the circle
  ctx.fill();
  ctx.stroke();
}

//Creates death screen
function deathScreen(ctx, canvas){

  //Creates low opacity black overlay
  ctx.fillStyle = 'rgba(0, 0, 0, .35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* Text styling */
  ctx.fillStyle = 'white';
  ctx.font = '60px Courier';
  ctx.textAlign = 'center';

  /* End text styling */

  //Adds text to center of canvas
  ctx.fillText("You Died", canvas.width / 2, canvas.height / 2);

  //Makes text smaller
  ctx.font = '40px Courier';

  //Adds text to center of canvas
  ctx.fillText("Click to respawn", canvas.width / 2, canvas.height / 2 + 50);

  //Adds event listener
  canvas.addEventListener('click', handle);
}

/* Code from https://www.sitepoint.com/create-one-time-events-javascript */

//Removes event after one click
function handle(e){

  //Removes event
  e.target.removeEventListener(e.type, arguments.callee);

  //Adds new player
  socket.emit('new player');
  dead = false;
}

/* End code from https://www.sitepoint.com/create-one-time-events-javascript */

//Renders map
function render(map, ctx){

  //Loops through all tiles
  for (let m in map){
    var tile = map[m];
    ctx.fillStyle = tile.color;
    ctx.fillRect(tile.x, tile.y, 30, 30);
  }
}

//Clears all zombies on screen (Developer)
function zClear(){
  socket.emit('clear zombies');
  return 'Cleared Zombies';
}

//Health kit class
class healthKit {
  constructor(item, ctx, ratio){
    this.ctx = ctx;
    this.x = item.x;
    this.y = item.y
    if (ratio){
      this.ratio = ratio;
    }else{
      this.ratio = 1;
    }
  }

  draw(){
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.x - 8 * this.ratio, this.y - 6 * this.ratio, 16 * this.ratio, 12 * this.ratio);
    this.ctx.fillStyle = '#e23d3d';
    this.ctx.fillRect(this.x - (4 * this.ratio), this.y - (2 * this.ratio), 8 * this.ratio, 4 * this.ratio);
    this.ctx.fillRect(this.x - (2 * this.ratio), this.y - (4 * this.ratio), 4 * this.ratio, 8 * this.ratio);
  }
}

//Bandage class
class bandage {
  constructor(item, circle, ctx, ratio){
    this.ctx = ctx;
    this.circle = circle;
    this.x = item.x;
    this.y = item.y;
    if (ratio){
      this.ratio = ratio;
    }else{
      this.ratio = 1;
    }
  }

  draw(){
    this.circle(this.x, this.y, 8 * this.ratio, 'white', 'white', this.ctx);
    this.circle(this.x, this.y, 3 * this.ratio, 'black', 'white', this.ctx);
  }
}

//Player class
class user {
  constructor(player, circle, ctx){
    this.x = player.x;
    this.y = player.y;
    this.circle = circle;
    this.ctx = ctx;
  }

  draw(){
    this.circle(this.x, this.y, 10, '#e8c28b', 'black', this.ctx);
  }
}

//Zombie class
class enemy {
  constructor(zombie, circle, ctx){
    this.x = zombie.x;
    this.y = zombie.y;
    this.circle = circle;
    this.ctx = ctx;
  }

  draw(){
    this.circle(this.x, this.y, 10, 'green', 'black', this.ctx);
  }
}
