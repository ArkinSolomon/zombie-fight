/* server.js
*
* The server-side file which contains the server as well as all of the game
* logic, which includes: parsing map data, handling movement, pathfinding, item
* and zombie spawning, and entity collision.
*
*/

/* Basic setup */

//Time of server start
const startTime = new Date().getTime();

//Changes directory
process.cwd(__dirname);

//Doesn't stop program on error
process.on('uncaughtException', (err) => {
  console.log(err.stack);
});

//Port for server
const port = 5000;

//Framerate
const fps = 60;
const framerate = 1000 / fps;

/* End basic setup */

//External modules
const arkin = require('arkin');
const fs = require('fs');

/* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

//Internal modules
const {createMap} = require('./map/createMap.js');
const gameConsole = require('./console.js');

//Server setup
const app = express();
const server = http.Server(app);
const io = socketIO(server);

//Emiter
const EventEmitter = require('events').EventEmitter;
const c = new EventEmitter;
module.exports.c = c;

//Starts server
app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));
app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '/static/index.html'));
});

/* End code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Clears the console
arkin.clear();

//Prints initializing server to look cool
console.log(`
   \x1b[47m\x1b[34m ################### \x1b[0m
   \x1b[47m\x1b[34m INITIALIZING SERVER \x1b[0m
   \x1b[47m\x1b[34m ################### \x1b[0m
`);

//Waits for one and a half a seconds
arkin.sleep(1500);

var walls;
var map;

//Creates tiles
createMap(() => {

  //Parses the map
  walls = JSON.parse(fs.readFileSync('./map/walls.zfm'));
  map = JSON.parse(fs.readFileSync('./map/map.zfm', 'utf8'));

  //Starts the server
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);

    //Starts the console
    gameConsole.start();

    //Starts spawning zombies
    spawnZombie();
  });
});

//Main data variable
var data = {
  entities: {},
  time: {},
  rules: {
    spawnZombies: false,
    spawnItems: false,
    zombieSpeed: .4,
    zombieSpawnInterval: 10050,
    playerSpeed: .25,
    playerSprintSpeed: .5
  }
};

//Keeps all entities
var entities = {
  players: {},
  zombies: {},
  items: {}
};

//Easier player handling
var players = {};

//Socket specific instructions
io.on('connection', (socket) => {

  //Gives player game data
  socket.emit('get data', {
    map: JSON.stringify(map),
    socketId: socket.id,
    framerate: framerate
  });

  //Renders map on console command
  c.on('render', () => {
    walls = JSON.parse(fs.readFileSync('./map/walls.zfm'));
    map = JSON.parse(fs.readFileSync('./map/map.zfm', 'utf8'));

    //Gives player game data
    socket.emit('get data', {
      map: JSON.stringify(map),
      socketId: socket.id,
      framerate: framerate
    });
  });

  //Initializes player
  socket.on('new player', (constantData) => {

    players[socket.id] = {
      x: 475,
      y: 450,
      health: 100,
      damage: false,
      dead: false,
      items: {
        healthKit: 0,
        bandage: 0
      },
      data: {
        ip: socket.handshake.address,
        joinTime: new Date().getTime(),
        username: (constantData && constantData.username) ? constantData.username : socket.id,
        color: (constantData && constantData.color) ? constantData.color : '#e8c28b'
      }
    };
  });

  //Uses health kit
  socket.on('healthKit', (id) => {

    //Checks to see if the player has health kits and that the player has less than 100 health
    if (entities.players[id] && entities.players[id].items && entities.players[id].items.healthKit > 0 && entities.players[id].health < 100){

      //Removes one health kit from players inventory
      entities.players[id].items.healthKit--;

      //Adds health
      entities.players[id].health += 25;

      //Makes sure health does not go over one hundred
      if (entities.players[id].health > 100){
        entities.players[id].health = 100;
      }
    }
  });

  //Uses bandages
  socket.on('bandage', (id) => {

    //Checks to see if the player has bandages and that the player has less than 100 health
    if (entities.players[id] && entities.players[id].items && entities.players[id].items.bandage > 0 && entities.players[id].health < 100){

      //Removes one bandage from players inventory
      entities.players[id].items.bandage--;

      //Adds health
      entities.players[id].health += 10;

      //Makes sure health does not go over one hundred
      if (entities.players[id].health > 100){
        entities.players[id].health = 100;
      }
    }
  });

  //Updates usernames
  socket.on('username', (username) => {
    if (username && entities.players[socket.id] && entities.players[socket.id].data){
      entities.players[socket.id].data.username = username;
    }
  });

  //Updates color
  socket.on('color', (color) => {
    if (color && color.socket && entities.players[color.socket] && entities.players[color.socket].data){
      entities.players[color.socket].data.color = '#' + color.hex;
    }
  });

  /* Modified from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

  //Runs on movement
  socket.on('movement', (keys) => {

    //Initializes player x and y
    var player = players[socket.id] || {};

    //Checks if the player is sprinting
    var speed = (keys.shift) ? data.rules.playerSprintSpeed : data.rules.playerSpeed;

    //Gets player plus or minus values for both x and y { minimum, maximum }
    var playerPOrMX = plusOrMinus(player.x, 10);
    var playerPOrMY = plusOrMinus(player.y, 10);

    //Creates usable data
    var playerPoints = {
      top: [player.x + speed + 10, playerPOrMY[0]],
      right: [playerPOrMX[1], player.y + speed + 10],
      bottom: [player.x + speed + 10, playerPOrMY[1]],
      left: [playerPOrMX[0], player.y + speed + 10]
    };

    //Up
    if (keys.up && !checkCollideAllWalls(playerPoints, 'top') && !keys.left && !keys.right && !keys.down){
      player.y -= speed;
    }

    //Left
    if (keys.left && !checkCollideAllWalls(playerPoints, 'left') && !keys.up && !keys.right && !keys.down) {
      player.x -= speed;
    }

    //Down
    if (keys.down && !checkCollideAllWalls(playerPoints, 'bottom') && !keys.left && !keys.right && !keys.up) {
      player.y += speed;
    }

    //Right
    if (keys.right && !checkCollideAllWalls(playerPoints, 'right') && !keys.left && !keys.up && !keys.down) {
      player.x += speed;
    }

    /* End modified code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

    //Top left
    if (keys.up && keys.left){

    }

    //Player bounding
    if (player.x > 960){
      player.x = 960;
    }else if (player.y > 900){
      player.y = 900;
    }else if (player.x < 0){
      player.x = 0;
    }else if (player.y < .1){
      player.y = .1;
    }

    //Updates players
    players[socket.id] = player;
  });

  //Removes players on disconnect
  socket.on('disconnect', () => {
    delete players[socket.id];
  });
});

//Main update function
setInterval(() => {

  const calcStart = new Date().getTime();

  //Date config for timestamp
  let config = {
    format: {
      extraZero: true,
      separator: '-'
    }
  };

  //Zombie bounding
  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];
    if (zombie.x > 960){
      zombie.x = 960;
    }else if (zombie.y > 900){
      zombie.y = 900;
    }else if (zombie.x < 0){
      zombie.x = 0;
    }else if (zombie.y < .1){
      zombie.y = .1;
    }
  }

  //Adds players to entities
  entities.players = players;

  //Removes items after one minute
  for (let i in entities.items){

    var itemDespawnTime = 60000;

    //Checks age
    let d = new Date().getTime();
    if (d - entities.items[i].id >= itemDespawnTime){
      entities.items[i].timeRemaining = Math.abs(itemDespawnTime - (d - entities.items[i].id));
      delete entities.items[i];
    }
  }

  //Arrays of entities and objects
  var playerArr = [];
  var zombieArr = [];
  var itemArr = [];

  /* Zombie collison detection */

  //Makes sure there are more than 3 zombies to prevent bugs
  if (Object.keys(entities.zombies).length > 2){

    //Loops through zombies
    for (let zomb in entities.zombies){
      var zombie = entities.zombies[zomb];

      //Pushes zombie's position and id
      zombieArr.push({
        x: zombie.x,
        y: zombie.y,
        id: zomb
      });
    }

    //Loops through all zombies
    for (let zZcollision = 0; zZcollision < zombieArr.length - 1; zZcollision++){

      //Picks out two consecutive zombies
      zombie1 = zombieArr[zZcollision];
      zombie2 = zombieArr[zZcollision + 1];

      //Makes sure all variables are present
      if ((Object.keys(entities.zombies).indexOf(zombie1.id) !== -1) && (Object.keys(entities.zombies).indexOf(zombie2.id) !== -1) && (zombie1.x && zombie1.y && zombie2.x && zombie2.y)){

        //Checks distance between zombies
        if (distance(zombie1.x, zombie2.x, zombie1.y, zombie2.y) < 20){

          //Pushes horizontally
          if (zombie1.x > zombie2.x){
            entities.zombies[zombie1.id].x = zombie2.x + 11;
          }else{
            entities.zombies[zombie1.id].x = zombie2.x - 11;
          }

          //Pushes vertically
          if (zombie1.y > zombie2.y){
            entities.zombies[zombie1.id].y = zombie2.y + 11;
          }else{
            entities.zombies[zombie1.id].y = zombie2.y - 11;
          }
        }
      }
    }
  }

  /* End zombie collison detection */

  //Resets zombieArr
  zombieArr = [];

  /* Zombie-player collison detection */

  //Makes sure there is more than one player
  if (Object.keys(entities.players).length > 0){

    //Loops through all players
    for (let play in entities.players){
      player = entities.players[play];

      //Pushes player's position and id
      playerArr.push({
        x: player.x,
        y: player.y,
        id: play
      });
    }

    //Loops through all zombies
    for (let zomb in entities.zombies){
      var zombie = entities.zombies[zomb];

      //Pushes zombie's position and id
      zombieArr.push({
        x: zombie.x,
        y: zombie.y,
        id: zomb
      });
    }

    //Loops through all players
    for (let playerCounter = 0; playerCounter < playerArr.length; playerCounter++){

      //Loops through all zombies
      for (let zPcollision = 0; zPcollision < zombieArr.length; zPcollision++){

        //Picks player and zombie
        player = playerArr[playerCounter];
        zombie = zombieArr[zPcollision];

        //Makes sure all variables are present
        if ((Object.keys(entities.players).indexOf(player.id) !== -1) && (Object.keys(entities.zombies).indexOf(zombie.id) !== -1) && (player.x && player.y && zombie.x && zombie.y)){

          //Checks distance between entities
          if (distance(player.x, zombie.x, player.y, zombie.y) < 20){

            //Pushes horizontally
            if (player.x > zombie.x){
              entities.players[player.id].x = zombie.x + 15;
            }else{
              entities.players[player.id].x = zombie.x - 15;
            }

            //Pushes vertically
            if (player.y > zombie.y){
              entities.players[player.id].y = zombie.y + 15;
            }else{
              entities.players[player.id].y = zombie.y - 15;
            }

            /* Damage */

            //Checks if player has invincibility
            if (entities.players[player.id].damage === true){

              //Adds invincibility
              entities.players[player.id].damage = false;

              //Removes health from player
              entities.players[player.id].health -= 10;

              //Checks if the player died
              if (entities.players[player.id].health <= 0){
                delete entities.players[player.id];
                io.sockets.emit('dead', player.id);
              }
            }

            /* End damage */

          }
        }
      }
    }
  }

  /* End zombie-player collison detection */

  /* Player-item collison*/

  //Checks if there are items
  if (Object.keys(entities.items).length > 0){

    //Loops through all items
    for (let i in entities.items){
      var item = entities.items[i];

      //Updates time left
      entities.items[i].timeRemaining = 60 - (new Date().getTime() - item.id);

      //Pushes item's position, id, and type
      itemArr.push({
        x: item.x,
        y: item.y,
        id: i,
        item: item.item
      });
    }

    //Loops through all players
    playerArr.forEach((player) => {

      //Makes sure player is still in the game
      if (Object.keys(entities.players).indexOf(player.id) !== -1){

        //Loops through all items
        itemArr.forEach((item) => {

          //Makes sure item is still in the game
          if (Object.keys(entities.items).indexOf(item.id) !== -1){

            //Gets plus or minus vertical and horizontal values
            var pOrMX = plusOrMinus(item.x, 10);
            var pOrMY = plusOrMinus(item.y, 10);

            //Collison detection
            if (player.x > pOrMX[0] && player.x < pOrMX[1] && player.y > pOrMY[0] && player.y < pOrMY[1]){

              //Adds item to player
              entities.players[player.id].items[item.item] += 1;

              //Removes item from game
              delete entities.items[item.id];
            }
          }
        });
      }
    });
  }

  /* End player-item collison */

  //Resets player array
  playerArr = [];

  //Checks if a player is dead
  for (let counter in entities.players){
    if (entities.players[counter].dead){
      delete entities.players[counter];
    }
  }

  //Defines date
  let date = new Date();

  //Timestamps
  data.time = {
    timestamp: `[${arkin.getDate(config)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`,
    ms: date.getTime(),
    serverRunTime: (date.getTime() - startTime).toString() + 'ms',
    calcTime: new Date().getTime() - calcStart
  };

  //Updates data
  data.entities = entities;
  gameConsole.update(data);

  //Sends data to all clients
  io.sockets.emit('update', JSON.stringify(data));

}, framerate);

//Removes invincibility
setInterval(() => {

  //Loops through all players
  for (let play in entities.players){
    var player = entities.players[play];

    //Checks if the player can get damaged
    if (!player.damage){

      //Removes damage after one second
      setTimeout(() => {

        //Makes sure player is still in game
        if (Object.keys(entities.players).indexOf(play) !== -1){
          entities.players[play].damage = true;
        }
      }, 1000)
    }
  }
}, framerate);

//Zombie spawning
function spawnZombie(){
  setTimeout(() => {

    //Checks if zombies should be spawned
    if (data.rules.spawnZombies){

      data.rules.zombieSpawnInterval -= 50;

      //Makes zombie id
      let id = `enemy${new Date().getTime()}`;

      //Creates zombie
      entities.zombies[id] = {
        x: Math.floor(Math.random() * 960),
        y: Math.floor(Math.random() * 900),
        health: 50,
        id: id
      }
    }
    spawnZombie();
  }, data.rules.zombieSpawnInterval);
}

//Increases zombie speed
setInterval(() => {
  data.rules.zombieSpeed += .02;
}, 30000);

//Pathfinding
setInterval(() => {

  //Loops through all zombies
  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];

    //Finds the nearest player
    var player = findClosestPlayer(zombie).data;

    //Makes sure all variables are present
    if (Object.keys(entities.players).length > 0 && Object.keys(entities.zombies).length > 0 && player && zombie && player.x && player.y && zombie.x && zombie.y){

      //Gets the angle of the slope in radians [ toRadian(sin^-1(|slope|)) ]
      var rad = toRad(Math.atan(Math.abs(zombie.x - player.x)) / (Math.abs(zombie.y - player.y)));

      //Declares sides
      var sides = {
        a: null,
        b: null,
        c: data.rules.zombieSpeed
      }

      //Finds side a [ sin(slopeAngle) * hypotenuse ]
      sides.a = Math.abs(Math.sin(rad) * sides.c);

      //Finds side b [ hypotenuse^2 - a^2 ]
      sides.b = Math.sqrt(square(sides.c) - square(sides.a));

      /* Add or subtract values */

      //Horizontal values
      if (zombie.x > player.x){
        entities.zombies[zombie.id].x -= sides.a;
      }else if (zombie.x < player.x){
        entities.zombies[zombie.id].x += sides.a;
      }

      //Vertical values
      if (zombie.y > player.y){
        entities.zombies[zombie.id].y -= sides.b;
      }else if (zombie.y < player.y){
        entities.zombies[zombie.id].y += sides.b;
      }

      entities.zombies[zombie.id].calculations = sides;

      /* End add or subtract values */

    }else if (!player){
      entities.zombies[zombie.id].calculations = {
        a: 'NO PLAYER',
        b: 'NO PLAYER',
        c: data.rules.zombieSpeed
      };
    }
  }
}, framerate);

//Finds closest player to a zombie
function findClosestPlayer(zombie){

  //Array of player ids
  var idArr = [];

  //Array of player distances
  var distArr = [];

  //Loops through all players
  for (let play in entities.players){
    var player = entities.players[play];

    //Pushes player id
    idArr.push(play);

    //Finds distances between x's and y's [ x1 - x2 ] [ y1 - y2 ]
    var a = player.x - zombie.x;
    var b = player.y - zombie.y;

    //Finds and pushes the distances
    distArr.push(distance(player.x, zombie.x, player.y, zombie.y));
  }

  //Finds the smallest distance
  var min = Math.min(...distArr);

  //Returns player and the distance from the zombie
  return {
    data: entities.players[idArr[distArr.indexOf(min)]],
    distance: min
  };
}

//Finds distance between two points
function distance(a1, a2, b1, b2){

  //Finds distances between x's and y's [ x1 - x2 ] [ y1 - y2 ]
  let a = a1 - a2;
  let b = b1 - b2;

  //Returns the distance [ squareRoot(a^2 + b^2) ]
  return Math.sqrt(square(a) + square(b));
}

//Checks tiles in front for walls
function checkCollideAllWalls(playerPoints, direction){

  //Variable to return
  var isWall = false;

  //Loops through all walls
  for (let pWCounter in walls){

    //Local wall { topLeftX, topLeftY, bottomRightX, bottomRightY }
    var wall = walls[pWCounter];

    //Makes sure all variables are present
    if (wall[0] && wall[1] && wall[2] && wall[3] && playerPoints && !isWall){

      //Checks
      if (wallIsCollide(playerPoints, wall, direction)){
        isWall = true;
      }
    }
  }
  return isWall;
}

//Wall collison function
function wallIsCollide(playerPoints, wall, which){
  if ((playerPoints[which][0] > wall[0] && playerPoints[which][0] < wall[2]) && (playerPoints[which][1] > wall[1] && playerPoints[which][1] < wall[3])){
    return true;
  }else{
    return false;
  }
}

//Clears zombies after five minutes
setInterval(() => {
  entities.zombies = {};
}, 300000);

//Spawns items
setInterval(() => {

  //Checks rules
  if (data.rules.spawnItems){

    //Determines what the item will be
    var type = function(){

      //Gets a random number
      var rand = Math.floor(Math.random() * 5);

      //Picks item
      if (rand <= 3){
        return 'bandage';
      }else{
        return 'healthKit';
      }
    }

    //Creates item
    let i = new item(type());

    //Adds item to entities
    entities.items[i.name()] = {
      x: i.x,
      y: i.y,
      item: i.item,
      id: i.id,
      timeRemaining: 60000
    };
  }
}, 15000);

//Player x and y movement
function movePlayer(player, speed, direction){

  //Checks if all variables are present
  if (player.x && player.y && speed){

    //Variable that stores sides
    let movement = {
      x: null,
      y: null
    };

    //Gets x side [ abs(pi / 4 * speed) ]
    movement.x =  Math.abs((Math.PI / 4) * speed);

    //Gets y side [ squareRoot(speed^2 - x^2) ]
    movement.y = Math.sqrt(square(speed) - square(movement.x));

    //Determines direction of travel and returns
    switch (direction) {
      case 'topLeft':
        return []
        break;
      case 'topRight':
        break;

    }
  }
}

//Converts degrees to radians (Equation from Google Unit Converter)
function toRad(deg) {

  //Converts [ (degrees * 180) / 3.14159... ]
  return deg * 180 / Math.PI
}

//Finds values greater than and less than a given value
function plusOrMinus(val, pOrM){

  //Returns values [ value - pOrM ] [ value + pOrM ]
  return [val - pOrM, val + pOrM];
}

//Squares a number
function square(number){

  //Returns the number squared [ value^2 ]
  return Math.pow(number, 2);
}

//Item class
class item {
  constructor(item){
    this.id = new Date().getTime().toString();
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

  name(){
    return 'item' + this.id;
  }
}
