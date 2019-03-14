var socket = io();
var entities = {};

var thisSocket;

var dead = false;

var movement = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
  q: false,
  e: false
}

document.addEventListener('keydown', function(event){
  switch (event.keyCode){
    case 65:
      movement.left = true;
      break;
    case 87:
      movement.up = true;
      break;
    case 68:
      movement.right = true;
      break;
    case 83:
      movement.down = true;
      break;
    case 16:
      movement.shift = true;
      break;
    case 81:
      movement.q = true;
      break;
    case 69:
      movement.e = true;
      break;
  }
});

document.addEventListener('keyup', function(event){
  switch (event.keyCode){
    case 65:
      movement.left = false;
      break;
    case 87:
      movement.up = false;
      break;
    case 68:
      movement.right = false;
      break;
    case 83:
      movement.down = false;
      break;
    case 16:
      movement.shift = false;
      break;
  }
});

socket.emit('new player');

socket.on('dead', function(id){
  if (id === thisSocket){
    dead = true;
  }
});

socket.on('get socket', function(socketId){
  thisSocket = socketId;
});

setInterval(function(){
  socket.emit('movement', movement);
}, 1000 / 60);

setInterval(function(){
  if (movement.e){
    socket.emit('healthKit', thisSocket);
    movement.e = false;
  }
});

setInterval(function(){
  if (movement.q){
    socket.emit('bandage', thisSocket);
    movement.q = false;
  }
});

var canvas = document.getElementById('canvas');
canvas.width = 950;
canvas.height = 900;
var ctx = canvas.getContext('2d');

socket.on('update', function(d){

  entities = d.entities;

  const ping = new Date().getTime() - d.time.ms;
  document.getElementById('ping').innerHTML = '';
  document.getElementById('ping').innerHTML = ping;

  ctx.fillStyle = 'rgb(119, 214, 85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'black';
  ctx.rect(10, 10, 100, 10);

  let counterHealthKit = new healthKit({
    x: 35,
    y: 860,
  }, ctx, 3);

  let counterBandage = new bandage({
    x: 100,
    y: 860,
  }, circle, ctx, 3);

  for (let i in entities.items){
    var item = entities.items[i];
    spawnItem(item, ctx);
  }

  for (let id in entities.players){
    var player = new user(entities.players[id], circle, ctx);
    player.draw();
  }

  for (let zomb in entities.zombies){
    var zombie = new enemy(entities.zombies[zomb], circle, ctx);
    zombie.draw();
  }

  if (Object.keys(entities.players).indexOf(thisSocket) === -1 || dead){
    deathScreen(ctx, canvas);
  }else{
    updateHealth(ctx);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(entities.players[thisSocket].items.healthKit, 35, 830);
    ctx.fillText(entities.players[thisSocket].items.bandage, 100, 830);
    counterHealthKit.draw();
    counterBandage.draw();
  }
});

function updateHealth(ctx){
  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'black';
  ctx.rect(10, 10, 100, 10);
  ctx.stroke();
  ctx.fillRect(11, 11, getHealthLength(entities.players[thisSocket].health), 8);
  ctx.fillStyle = 'white';
  ctx.font = '9px Arial';
  ctx.fillText(entities.players[thisSocket].health, 20, 18);
}

function getHealthLength(health){
  if (health < 98){
    return health;
  }else{
    return 98;
  }
}

function spawnItem(item, ctx){
  circle(item.x, item.y, 14, 'rgba(0, 0, 0, .45)', 'black', ctx);

  if (item.item === 'bandage'){
    let bd = new bandage(item, circle, ctx);
    bd.draw();
  }else if (item.item === 'healthKit'){
    let hk = new healthKit(item, ctx);
    hk.draw()
  }
}

function circle(x, y, r, fill, stroke, ctx){
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}

function deathScreen(ctx, canvas){
  ctx.fillStyle = 'rgba(0, 0, 0, .35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '60px Courier';
  ctx.textAlign = 'center';
  ctx.fillText("You Died", canvas.width / 2, canvas.height / 2);
  ctx.font = '40px Courier';
  ctx.fillText("Click to respawn", canvas.width / 2, canvas.height / 2 + 50);
  canvas.addEventListener('click', handle);
}

function handle(e){
  e.target.removeEventListener(e.type, arguments.callee);
  socket.emit('new player');
  dead = false;
}

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
