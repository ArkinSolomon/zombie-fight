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

socket.on('update', function(e){

  entities = e;

  ctx.fillStyle = 'rgb(119, 214, 85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'black';
  ctx.rect(10, 10, 100, 10);

  for (let id in entities.players){
    var player = entities.players[id];
    circle(player.x, player.y, 10, '#e8c28b', 'black', ctx);
  }

  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];
    circle(zombie.x, zombie.y, 10, 'green', 'black', ctx);
  }

  for (let i in entities.items){
    var item = entities.items[i];
    spawnItem(item, ctx);
  }

  if (Object.keys(entities.players).indexOf(thisSocket) === -1 || dead){
    deathScreen(ctx, canvas);
  }else{
    updateHealth(ctx);
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
  ctx.fillText(entities.players[thisSocket].health.toString(), 20, 18);
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
  canvas.addEventListener('click', function(){
    dead = false;
    canvas.removeEventListener('click');
    socket.emit('new player');
  });
}

class healthKit {
  constructor(item, ctx){
    this.ctx = ctx;
    this.x = item.x;
    this.y = item.y
  }

  draw(){
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(this.x - 8, this.y - 6, 16, 12);
    this.ctx.fillStyle = '#e23d3d';
    this.ctx.fillRect(this.x - 4, this.y - 2, 8, 4);
    this.ctx.fillRect(this.x - 2, this.y - 4, 4, 8);
  }
}

class bandage {
  constructor(item, circle, ctx){
    this.ctx = ctx;
    this.circle = circle;
    this.x = item.x;
    this.y = item.y;
  }

  draw(){
    this.circle(this.x, this.y, 8, 'white', 'white', this.ctx);
    this.circle(this.x, this.y, 3, 'black', 'white', this.ctx);
  }
}
