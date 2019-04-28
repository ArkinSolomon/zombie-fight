/* game.js
*
* The client-side file which draws the data which has been recieved from the
* server and also sends user input to the server.
*
*/

//Creates server contact function
var socket = io();

//Keeps entities local and easier to access
var entities = {};

//Stores socket id
var thisSocket;

//Gets cookies
document.getElementById('username').value = (getCookie('username')) ? getCookie('username') : '';
document.getElementById('color').value = (getCookie('color')) ? getCookie('color') : '#e8c28b';

//Stores username
var thisUsername = (document.getElementById('username').value.trim()) ? document.getElementById('username').value.trim() : null;
var thisColor = (document.getElementById('color').value) ? document.getElementById('color').value : '#e8c28b';

//Stores map
var map;

//Stores framerate
var framerate;

//Canvas initialization
var canvas = document.getElementById('canvas');
canvas.width = 960;
canvas.height = 900;
var ctx = canvas.getContext('2d');

//Checks if player is dead
var dead = function(e){
  if (typeof e === 'boolean') return e;
  if (!entities.players[thisSocket] || (entities.players[thisSocket] && entities.players[thisSocket].dead === true) || typeof entities.players[thisSocket].dead === 'undefined'){
    return true;
  }else{
    return false;
  }
};

/* Modified code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Keeps track of which keys are pressed
var movement = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
  q: false,
  e: false
};

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
    case 81: //Q
      movement.q = true;
      break;
    case 69: //E
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

/* End modified code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Sends new player command to server
socket.emit('new player');

//Checks if player is dead
socket.on('dead', function(id){

  //Checks if socket id is this client's socket id
  if (id === thisSocket){

    //Sets player to dead
    dead(true);
  }
});

//Gets initial message
socket.on('get data', function(data){

  //Gets socket id
  if (data.socketId){
    thisSocket = data.socketId;
  }

  //Changes username if needeed
  if (!thisUsername){
    thisUsername = data.socketId;
  }

  //Gets map
  map = JSON.parse(data.map);

  //Gets framerate
  if (data.framerate){
    framerate = data.framerate;
  }
});

//Checks for socket disconnect
setInterval(function(){
  if (!socket.connected){
    drawDisconnect();
  }
}, framerate);

//Checks for color update
setInterval(function(){
  thisColor = document.getElementById('color').value;
  sendColor(thisColor.replace('#', ''));
}, framerate);

//Checks for movement
setInterval(function(){
  socket.emit('movement', movement);
}, framerate);

//Checks for health kit
setInterval(function(){
  if (movement.e){
    socket.emit('healthKit', thisSocket);
    movement.e = false;
  }
}, framerate);

//Checks for bandage
setInterval(function(){
  if (movement.q){
    socket.emit('bandage', thisSocket);
    movement.q = false;
  }
}, framerate);

//Runs on update from server
socket.on('update', function(dataFromServer){

  //Parses data
  const d = JSON.parse(dataFromServer);

  //Simplifies entities
  entities = d.entities;

  //Renders map
  render();

  /* Item counters */

  let counterBandage = new Bandage({
    x: 35,
    y: 860,
  }, circle, 3);

  let counterHealthKit = new Healthkit({
    x: 100,
    y: 860,
  }, 3);

  /* End item counters */

  //Loops through items
  for (let i in entities.items){
    var item = entities.items[i];
    spawnItem(item);
  }

  //Loops through zombies
  for (let zomb in entities.zombies){
    var zombie = new Enemy(entities.zombies[zomb], circle);
    zombie.draw();
  }

  //Loops through players
  for (let id in entities.players){
    if (entities.players[id]){
      var player = new User(entities.players[id], circle);
      player.draw();
    }
  }

  //Checks if player is dead
  if (dead(entities)){

    //Draws death screen
    deathScreen();
  }else{

    //Writes username
    ctx.fillStyle = 'white';
    ctx.font = '38px Arial';
    ctx.textAlign = 'center';
    ctx.fillText((thisUsername) ? thisUsername : thisSocket, canvas.width / 2, canvas.height - 30);

    //Draws health bar
    ctx.strokeStyle = 'black';
    ctx.rect(10, 10, 100, 10);

    //Updates health
    updateHealth();

    /* Text styling */

    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';

    /* End text styling */

    //Item amount text
    ctx.fillText(entities.players[thisSocket].items.bandage, 35, 830);
    ctx.fillText(entities.players[thisSocket].items.healthKit, 100, 830);
    counterHealthKit.draw();
    counterBandage.draw();
  }
});

//Updates the health
function updateHealth(){

  /* Color styling */

  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'black';

  /* End color styling */

  //Border
  ctx.rect(10, 10, 100, 10);
  ctx.stroke();
  ctx.fillRect(11, 11, (entities.players[thisSocket] && entities.players[thisSocket].health) ? getHealthLength(entities.players[thisSocket].health, false) : .0000000000000001, 8);

  /* Text styling */

  ctx.fillStyle = 'white';
  ctx.font = '9px Arial';

  /* End text styling */

  //Text
  ctx.fillText((entities.players[thisSocket] && entities.players[thisSocket].health) ? getHealthLength(entities.players[thisSocket].health, true)  : '0', 20, 18);
}

//Returns percentage of health to fill
function getHealthLength(health, text){
  if (health < 98){
    return health;
  }else{
    return (text) ? 100 : 98;
  }
}

//Draws an item
function spawnItem(item){

  //Creates a circle
  circle(item.x, item.y, 14, 'rgba(0, 0, 0, .45)', 'black');

  //Checks item and draws the item based on its type
  if (item.item === 'bandage'){
    let bd = new Bandage(item, circle);
    bd.draw();
  }else if (item.item === 'healthKit'){
    let hk = new Healthkit(item);
    hk.draw()
  }
}

//Draws a circle
function circle(x, y, r, fill, stroke){

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
function deathScreen(){

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

/* Modified code from https://www.sitepoint.com/create-one-time-events-javascript */

//Removes event after one click
function handle(e){

  //Makes sure the player is dead
  if (dead() || !entities.players[thisSocket]){

    //Removes event
    e.target.removeEventListener(e.type, arguments.callee);

    //Adds new player
    socket.emit('new player', {
      username: (thisUsername) ? thisUsername : undefined,
      color: (thisColor) ? thisColor : undefined
    });
    dead(false);
  }
}

/* End modified code from https://www.sitepoint.com/create-one-time-events-javascript */

//Draws disconnected screen
function drawDisconnect(){

  //Fills the screen
  ctx.fillStyle = '#f73640';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //Draws the image
  let image = document.getElementById('disconnectImg');
  ctx.drawImage(image, (canvas.width - image.width) / 2, ((canvas.height - image.height) / 2) - 100);

  //Writes text
  ctx.font = '60px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText("Can not connect to server", canvas.width / 2, (canvas.height / 2) + 100);
}

//Renders map
function render(){

  //Loops through all tiles
  for (let m in Object.keys(map)){
    var tile = map[m];

    //Fills it in
    ctx.fillStyle = (tile && tile.color) ? tile.color : '#77d655';
    ctx.fillRect(tile.x, tile.y, 15, 15);
  }
}

//Sends player username to server
function updateUsername(){
  var val = document.getElementById('username').value;

  //Sets cookies
  setCookie('username', val, 30);

  //Makes sure it is not a blank string
  if (val && val !== '' && val.replace(/\s/g, '').length !== 0){

    //Limits to twenty characters
    if (val.length > 20){
      val = val.substring(0, 19);
    }
    thisUsername = document.getElementById('username').value.trim();
    socket.emit('username', thisUsername);
  }
}

//Sends color to server
function sendColor(hex){
  setCookie('color', '#' + hex, 30);
  socket.emit('color', {
    hex: hex,
    socket: thisSocket
  });
}

/* Code from https://www.w3schools.com/js/js_cookies.asp */

//Sets a cookie
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

//Gets a cookie
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

/* End code from https://www.w3schools.com/js/js_cookies.asp */

//Health kit class
class Healthkit {
  constructor(item, ratio){
    this.x = item.x;
    this.y = item.y
    this.ratio = (ratio) ? ratio : 1;
  }

  draw(){
    ctx.fillStyle = 'white';
    ctx.fillRect(this.x - 8 * this.ratio, this.y - 6 * this.ratio, 16 * this.ratio, 12 * this.ratio);
    ctx.fillStyle = '#e23d3d';
    ctx.fillRect(this.x - (4 * this.ratio), this.y - (2 * this.ratio), 8 * this.ratio, 4 * this.ratio);
    ctx.fillRect(this.x - (2 * this.ratio), this.y - (4 * this.ratio), 4 * this.ratio, 8 * this.ratio);
  }
}

//Bandage class
class Bandage {
  constructor(item, circle, ratio){
    this.circle = circle;
    this.x = item.x;
    this.y = item.y;
    this.ratio = (ratio) ? ratio : 1;
  }

  draw(){
    this.circle(this.x, this.y, 8 * this.ratio, 'white', 'white', ctx);
    this.circle(this.x, this.y, 3 * this.ratio, 'black', 'white', ctx);
  }
}

//Player class
class User {
  constructor(player, circle, ctx){
    this.x = player.x;
    this.y = player.y;
    this.circle = circle;
    ctx = ctx;
    this.player = player;
    this.color = (entities.players[player.id] && entities.players[player.id].data && entities.players[player.id].data && entities.players[player.id].data.color) ? entities.players[player.id].data.color : '#e8c28b';
    this.username = thisUsername;
  }

  draw(){
    this.circle(this.x, this.y, 10, this.color, 'black', ctx);
    ctx.font = "12px Arial";
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(thisUsername, this.x, this.y - 20);
  }
}

//Zombie class
class Enemy {
  constructor(zombie, circle, ctx){
    this.x = zombie.x;
    this.y = zombie.y;
    this.circle = circle;
    ctx = ctx;
  }

  draw(){
    this.circle(this.x, this.y, 10, 'green', 'black', ctx);
  }
}
