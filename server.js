process.cwd(__dirname);
process.on('uncaughtException', (err) => {
  console.log(err.stack);
});

const startTime = new Date().getTime();

const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);
const port = 5000;
const {getDate} = require('arkin');

var data = {
  entities: {},
  time: {}
};

var entities = {
  players: {},
  zombies: {},
  items: {}
};

var zombieSpeed = .6;
var zombieSpawnInterval = function(){
  return 10000;
};

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
  console.log(`Player joined: ${socket.id}`);
  socket.emit('get socket', socket.id);
  socket.on('new player', () => {
    players[socket.id] = {
      x: 475,
      y: 450,
      health: 100,
      damage: false,
      items: {
        healthKit: 0,
        bandage: 0
      }
    };
  });

  socket.on('healthKit', (id) => {
    if (entities.players[id].items.healthKit > 0 && entities.players[id].health < 100){
      entities.players[id].items.healthKit--;
      entities.players[id].health += 25;
      if (entities.players[id].health > 100){
        entities.players[id].health = 100;
      }
    }
  });

  socket.on('bandage', (id) => {
    if (entities.players[id].items.bandage > 0 && entities.players[id].health < 100){
      entities.players[id].items.bandage--;
      entities.players[id].health += 10;
      if (entities.players[id].health > 100){
        entities.players[id].health = 100;
      }
    }
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
      player.x = 950;
    }else if (player.y > 900){
      player.y = 900;
    }else if (player.x < 0){
      player.x = 0;
    }else if (player.y < 0){
      player.y = 0;
    }
    players[socket.id] = player;
  });

  socket.on('disconnect', () => {
    console.log(`Player left: ${socket.id}`);
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
      zombie.x = 950;
    }else if (zombie.y > 900){
      zombie.y = 900;
    }else if (zombie.x < 0){
      zombie.x = 0;
    }else if (zombie.y < 0){
      zombie.y = 0;
    }
  }

  entities.players = players;

  var playerArr = [];
  var zombieArr = [];
  var itemArr = [];

  if (Object.keys(entities.zombies).length > 2){
    for (let zomb in entities.zombies){
      var zombie = entities.zombies[zomb];
      zombieArr.push({
        x: zombie.x,
        y: zombie.y,
        id: zomb
      });
    }

    for (let zZCollision = 0; zZCollision < zombieArr.length - 1; zZCollision++){
      zombie1 = zombieArr[zZCollision];
      zombie2 = zombieArr[zZCollision + 1];
      if ((Object.keys(entities.zombies).indexOf(zombie1.id) !== -1) && (Object.keys(entities.zombies).indexOf(zombie2.id) !== -1) && (zombie1.x && zombie1.y && zombie2.x && zombie2.y)){
        if (distance(zombie1.x, zombie2.x, zombie1.y, zombie2.y) < 20){
          if (zombie1.x > zombie2.x){
            entities.zombies[zombie1.id].x = zombie2.x + 11;
          }else{
            entities.zombies[zombie1.id].x = zombie2.x - 11;
          }

          if (zombie1.y > zombie2.y){
            entities.zombies[zombie1.id].y = zombie2.y + 11;
          }else{
            entities.zombies[zombie1.id].y = zombie2.y - 11;
          }
        }
      }
    }
  }

  zombieArr = [];

  if (Object.keys(entities.players).length > 0){
    for (let play in entities.players){
      player = entities.players[play];
      playerArr.push({
        x: player.x,
        y: player.y,
        id: play
      });
    }

    for (let zomb in entities.zombies){
      var zombie = entities.zombies[zomb];
      zombieArr.push({
        x: zombie.x,
        y: zombie.y,
        id: zomb
      });
    }

    for (let playerCounter = 0; playerCounter < playerArr.length; playerCounter++){
      for (let zPCollision = 0; zPCollision < zombieArr.length; zPCollision++){
        player = playerArr[playerCounter];
        zombie = zombieArr[zPCollision];
        if ((Object.keys(entities.players).indexOf(player.id) !== -1) && (Object.keys(entities.zombies).indexOf(zombie.id) !== -1) && (player.x && player.y && zombie.x && zombie.y)){
          if (distance(player.x, zombie.x, player.y, zombie.y) < 20){
            if (player.x > zombie.x){
              entities.players[player.id].x = zombie.x + 15;
            }else{
              entities.players[player.id].x = zombie.x - 15;
            }

            if (player.y > zombie.y){
              entities.players[player.id].y = zombie.y + 15;
            }else{
              entities.players[player.id].y = zombie.y - 15;
            }

            if (entities.players[player.id].damage === true){
              entities.players[player.id].health -= 10;
              entities.players[player.id].damage = false;
              if (entities.players[player.id].health <= 0){
                delete entities.players[player.id];
                io.sockets.emit('dead', player.id);
              }
            }
          }
        }
      }
    }
  }

  if (Object.keys(entities.items).length > 0){
    for (let i in entities.items){
      var item = entities.items[i];
      itemArr.push({
        x: item.x,
        y: item.y,
        id: i,
        item: item.item
      });
    }

    playerArr.forEach((player) => {
      if (Object.keys(entities.players).indexOf(player.id) !== -1){
        itemArr.forEach((item) => {
          if (Object.keys(entities.items).indexOf(item.id) !== -1){
            var pOrMX = plusOrMinus(item.x, 10);
            var pOrMY = plusOrMinus(item.y, 10);
            if (player.x > pOrMX[0] && player.x < pOrMX[1] && player.y > pOrMY[0] && player.y < pOrMY[1]){
              entities.players[player.id].items[item.item] += 1;
              delete entities.items[item.id];
            }
          }
        });
      }
    });
  }

  let date = new Date();
  data.time = {
    timestamp: `[${getDate(config)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`,
    ms: date.getTime()
  };
  data.entities = entities;
  io.sockets.emit('update', data);
}, 1000 / 60);

setInterval(() => {
  for (let play in entities.players){
    var player = entities.players[play];
    if (player.damage === false){
      setTimeout(() => {
        if (Object.keys(entities.players).indexOf(play) !== -1){
          entities.players[play].damage = true;
        }
      }, 1000)
    }
  }
}, 1000 / 60);

setInterval(() => {
  let date = new Date();
  let id = `zombie${date.getTime()}`;
  entities.zombies[id] = {
    x: Math.floor(Math.random() * 950),
    y: Math.floor(Math.random() * 900),
    health: 50
  }
}, zombieSpawnInterval());

setInterval(() => {
  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];
    var player = findClosestPlayer(zombie).data
    if (Object.keys(entities.players).length > 0 && Object.keys(entities.zombies).length > 0 && player && zombie && player.x && player.y && zombie.x && zombie.y){
      var rad = toDeg(Math.atan(Math.abs(zombie.x - player.x)) / (Math.abs(zombie.y - player.y)));
      var sides = {
        a: null,
        b: null,
        c: zombieSpeed
      }

      sides.a = Math.abs(Math.sin(rad) * sides.c);
      sides.b = Math.sqrt(square(sides.c) - square(sides.a));

      console.log(sides);

      if (zombie.x > player.x){
        zombie.x -= sides.a;
      }else if (zombie.x < player.x){
        zombie.x += sides.a;
      }

      if (zombie.y > player.y){
        zombie.y -= sides.b;
      }else if (zombie.y < player.y){
        zombie.y += sides.b;
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
  return {
    data: entities.players[idArr[distArr.indexOf(min)]],
    distance: min
  };
}

function distance(a1, a2, b1, b2){
  let a = a1 - a2;
  let b = b1 - b2;

  return Math.sqrt(square(a) + square(b));
}

setInterval(() => {
  entities.zombies = {};
}, 3000000);

io.on('clear zombies', () => {
  entities.zombies = {};
});

setInterval(() => {
  let date = new Date();
  var type = function(){
    var rand = Math.floor(Math.random() * 5);
    if (rand <= 3){
      return 'bandage';
    }else{
      return 'healthKit';
    }
  }

  let i = new item(type(), date.getTime().toString());
  entities.items[i.id] = {
    x: i.x,
    y: i.y,
    item: i.item,
    id: i.id
  };
}, 15000);

function toDeg(rad) {
  return rad * 180 / Math.PI
}

function plusOrMinus(val, pOrM){
  return [val - pOrM, val + pOrM];
}

function square(number){
  return Math.pow(number, 2);
}

class item {
  constructor(item, id){
    this.id = id;
    this.item = item;
    this.x = Math.floor(Math.random() * 951);
    this.y = Math.floor(Math.random() * 901);
  }

  item(){
    return this.item;
  }

  id(){
    return this.id;
  }

  x(){
    return this.x;
  }

  y(){
    return this.y;
  }
}
