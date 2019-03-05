const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const {getDate} = require('arkin');

const entities = {
  players: {},
  zombies: {}
};

const port = 5000

app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '/static/index.html'));
});

server.listen(port, () => {
  console.log('Starting server on port ' + port);
});

var players = {};

io.on('connection', (socket) => {
  socket.on('new player', function() {
    players[socket.id] = {
      x: 475,
      y: 450,
      health: 100,
      items: {
        healthKits: 0,
        bandages: 0
      }
    };
  });

  socket.on('movement', (data) => {
    var player = players[socket.id] || {};
    var speed;

    if (data.shift){
        speed = 2;
    }else{
      speed = 1;
    }

    if (data.left) {
      player.x -= speed;
    }
    if (data.up) {
      player.y -= speed;
    }
    if (data.right) {
      player.x += speed;
    }
    if (data.down) {
      player.y += speed;
    }

    if (player.x > 950){
      player.x = 900;
    }else if (player.y > 900){
      player.y = 900;
    }else if (player.x < 0){
      player.x = 0;
    }else if (player.y < 0){
      player.y = 0;
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
  });
});

setInterval(() => {
  let config = {
    format: {
      extraZero: true,
      separator: '-'
    }
  };

  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];
    if (zombie.x > 950){
      zombie.x = 900;
    }else if (zombie.y > 900){
      zombie.y = 900;
    }else if (zombie.x < 0){
      zombie.x = 0;
    }else if (zombie.y < 0){
      zombie.y = 0;
    }
  }

  entities.players = players;
  let date = new Date();
  entities.time = `[${getDate(config)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`;
  console.log(entities);
  io.sockets.emit('update', entities);
}, 1000 / 60);

setInterval(() => {
  let date = new Date();
  let id = `zombie${date.getTime()}`;
  entities.zombies[id] = {
    x: Math.floor(Math.random() * 951),
    y: Math.floor(Math.random() * 901),
    health: 50
  }
}, 10000);

let promises = [];
setInterval(() => {
  if (entities.players){
    for (let zomb in entities.zombies){
      var zombie = entities.zombies[zomb];
      var player = findClosestPlayer(zombie);
      if (zombie.x > player.x){
        zombie.x -= 0.5;
      }else if (zombie.x < player.x){
        zombie.x += 0.5;
      }
      if (zombie.y > player.y){
        zombie.y -= 0.5;
      }else if (zombie.y < player.y){
        zombie.y += 0.5;
      }
    }
  }
}, 1000 / 60);

function findClosestPlayer(zombie){
  var idArr = [];
  var distArr = [];
  for (let play in entities.players){
    var player = entities.players[play];
    idArr.push(play);
    var a = player.x - zombie.x;
    var b = player.y - zombie.y;
    distArr.push(distance(player.x, zombie.x, player.y, zombie.y));
  }

  var min = Math.min(...distArr);
  return entities.players[idArr[distArr.indexOf(min)]];
}

setInterval(() => {
  var zombie = [];
  var player = [];
  for (let zomb in entities.zombies){
    zombie.push(entities.zombies[zomb]);
  }

  for (let play in entities.players){
    player.push(entities.players[play]);
  }

  for (let zombieZombieCollision = 0; zombieZombieCollision < zombie.length; zombieZombieCollision++){
    var zombie1 = zombie[zombieZombieCollision];
    var zombie2 = zombie[zombieZombieCollision + 1];
    if (distance(zombie1.x, zombie2.x, zombie1.y, zombie2.y) < 20){
      zombie1.x = zombie2.x - 10;
      zombie1.y = zombie2.y - 10;
    }
  }
}, 1000 / 60);

function distance(a1, a2, b1, b2){
  var a = a1 - a2;
  var b = b1 - b2;

  return Math.sqrt((a * a) + (b*b));
}

setInterval(() => {
  entities.zombies = {};
}, 3000000);
