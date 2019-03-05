var socket = io();

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
});

socket.on('zombie spawn', function(entities){
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
