const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const {getDate} = require('arkin');

const entities = {};

const date = new Date();

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

  players.time = `[${getDate(config)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`;
  console.log(players);
  io.sockets.emit('update', entities);
}, 1000 / 60);

var timeOfStart;

socket.on('start', () => {
  timeOfStart = date.getTime();
});

async function interval(){
  var time = 10000;
  return time;
}

setInterval(() =>) {
  entities.[`zombie${date.getTime()}`] = {
    x: Math.floor(Math.random() * 951),
    y: Math.floor(Math.random() * 901)
  }
  socket.emmit('zombie spawn', entities);
}, interval();
