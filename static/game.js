var socket = io();
var entities = {};

var movement = {
  up: false,
  down: false,
  left: false,
  right: false,
  shift: false,
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
setInterval(function() {
  socket.emit('movement', movement);
}, 1000 / 60);

var canvas = document.getElementById('canvas');
canvas.width = 950;
canvas.height = 900;
var ctx = canvas.getContext('2d');

socket.on('update', function(entities){

  entities = entities;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgb(241,194,125)';
  ctx.strokeStyle = 'black';

  for (let id in entities.players){
    var player = entities.players[id];
    ctx.beginPath();
    ctx.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];
    ctx.fillStyle = 'green';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(zombie.x, zombie.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
});

setInterval(function(){
  var players = [];
  var zombies = [];
  for (play in entities.players){
    let player = entity.players[play];
    let playerObject = {
        x: player.x,
        y: player.y,
        id: play
    }
    players.push(playerObject);
  }

  for (zomb in entities.zombies){
    let zombie = entities.zombies[zomb];
    let zombieObject = {
        x: zombie.x,
        y: zombie.y,
        id: zombieObject
    }
    zombies.push(playerObject);
  }

  console.log(zombies.length);

  for (let zZCollison = 0; zZCollison < zombies.length - 2; zZCollison++){
    console.log('run');
    var hitbox1 = {
      x: zombies[zZCollison].x,
      y: zombies[zZCollison].y,
      height: 10,
      width: 10
    };

    var hitbox2 = {
      x: zombies[zZCollison + 1].x,
      y: zombies[zZCollison + 1].y,
      height: 10,
      width: 10
    };
    if (checkHitbox(hitbox1, hitbox2)){
      console.log('hit');
    }
  }
}, 1000 / 60);

function checkHitbox(hitbox1, hitbox2){
  console.log('check');
  if (Math.abs(hitbox1.x - hitbox2.x) <= 10 && Math.abs(hitbox1.y - hitbox2.y) <= 10){
     return true;
   }else{
     return false;
   }
}
