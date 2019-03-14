//Basic setup
const startTime = new Date().getTime();
process.cwd(__dirname);
process.on('uncaughtException', (err) => {
  console.log(err.stack);
});

//External modules
const arkin = require('arkin');
const fs = require('fs');

/* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

//Server setup
const app = express();
const server = http.Server(app);
const io = socketIO(server);

/* End code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Internal modules
const {createMap} = require('./createMap');

//Port
const port = 5000;

//Main variable to be sent
var data = {
  entities: {},
  time: {}
};

//Keeps all entities
var entities = {
  players: {},
  zombies: {},
  items: {}
};

//Clears the console
arkin.clear();

//Prints "Initializing Server" to look cool
console.log(`
   \x1b[47m\x1b[34m ################### \x1b[0m
   \x1b[47m\x1b[34m INITIALIZING SERVER \x1b[0m
   \x1b[47m\x1b[34m ################### \x1b[0m
`);

//Waits for three seconds before continuing to make it look like the server is doing something complex in the background
arkin.sleep(3000);

//Creates tiles
createMap();

//Determines zombie speed
var zombieSpeed = function(){
  return .5;
};

//Determines zombie spawn times
var zombieSpawnInterval = function(){
  return 10000;
};

/* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Starts server
app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '/static/index.html'));
});

server.listen(port, () => {
  console.log('Server listening on port ' + port);
});

/* End code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

//Easier player handling
var players = {};

//Socket specific instructions
io.on('connection', (socket) => {

  //Logs player socket id to the console
  console.log(`Player joined: ${socket.id}`);

  //Gives player socket id
  socket.emit('get socket', {
    map: fs.readFileSync('./map.json', 'utf8').map,
    socketId: socket.id
  });

  //Initializes player
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

  //Uses health kit
  socket.on('healthKit', (id) => {

    //Checks to see if the player has health kits and that the player has less than 100 health
    if (entities.players[id].items.healthKit > 0 && entities.players[id].health < 100){

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
    if (entities.players[id].items.bandage > 0 && entities.players[id].health < 100){

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

  /* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

  //Runs on movement
  socket.on('movement', (data) => {

    //Initializes player x and y
    var player = players[socket.id] || {};

    //Checks if the player is sprinting
    var speed;
    if (data.shift){
        speed = 2;
    }else{
      speed = 1;
    }

    /* Key presses */

    //A
    if (data.left) {
      player.x -= speed;
    }

    //W
    if (data.up) {
      player.y -= speed;
    }

    //D
    if (data.right) {
      player.x += speed;
    }

    //S
    if (data.down) {
      player.y += speed;
    }

    /* End key presses */

    /* End code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

    //Player bounding
    if (player.x > 950){
      player.x = 950;
    }else if (player.y > 900){
      player.y = 900;
    }else if (player.x < 0){
      player.x = 0;
    }else if (player.y < 0){
      player.y = 0;
    }

    //Updates players
    players[socket.id] = player;
  });

  //Clears zombies (Developer only)
  socket.on('clear zombies', () => {
    entities.zombies = {};
  });

  //Removes players on disconnect
  socket.on('disconnect', () => {
    console.log(`Player left: ${socket.id}`);
    delete players[socket.id];
  });
});

//Main update function
setInterval(() => {

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

  //Adds players to entities
  entities.players = players;

  //Arrays of items
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
    for (let zZCollision = 0; zZCollision < zombieArr.length - 1; zZCollision++){

      //Picks out two consecutive zombies
      zombie1 = zombieArr[zZCollision];
      zombie2 = zombieArr[zZCollision + 1];

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
      for (let zPCollision = 0; zPCollision < zombieArr.length; zPCollision++){

        //Picks player and zombie
        player = playerArr[playerCounter];
        zombie = zombieArr[zPCollision];

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

              //Removes health from player
              entities.players[player.id].health -= 10;

              //Adds invincibility
              entities.players[player.id].damage = false;

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

  /* End player-item collison*/

  //Defines date
  let date = new Date();

  //Timestamps
  data.time = {
    timestamp: `[${arkin.getDate(config)} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:${date.getMilliseconds()}]`,
    ms: date.getTime()
  };

  //Updates data
  data.entities = entities;

  //Sends data to all clients
  io.sockets.emit('update', data);

}, 1000 / 60);

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
}, 1000 / 60);

//Zombie spawning
setInterval(() => {

  //Makes zombie id
  let id = `zombie${new Date().getTime()}`;

  //Creates zombie
  entities.zombies[id] = {
    x: Math.floor(Math.random() * 950),
    y: Math.floor(Math.random() * 900),
    health: 50
  }
}, zombieSpawnInterval());

//Pathfinding
setInterval(() => {

  //Loops through all zombies
  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];

    //Finds the nearest player
    var player = findClosestPlayer(zombie).data

    //Makes sure all variables are present
    if (Object.keys(entities.players).length > 0 && Object.keys(entities.zombies).length > 0 && player && zombie && player.x && player.y && zombie.x && zombie.y){

      //Gets the angle of the slope in radians [ toRadian(sin^-1(|slope|)) ]
      var rad = toRad(Math.atan(Math.abs(zombie.x - player.x)) / (Math.abs(zombie.y - player.y)));

      //Declares sides
      var sides = {
        a: null,
        b: null,
        c: zombieSpeed()
      }

      //Finds side a [ sin(slopeAngle) * hypotenuse ]
      sides.a = Math.abs(Math.sin(rad) * sides.c);

      //Finds side b [ hypotenuse^2 - a^2 ]
      sides.b = Math.sqrt(square(sides.c) - square(sides.a));

      /* Add or subtract values */

      //Horizontal values
      if (zombie.x > player.x){
        zombie.x -= sides.a;
      }else if (zombie.x < player.x){
        zombie.x += sides.a;
      }

      //Vertical values
      if (zombie.y > player.y){
        zombie.y -= sides.b;
      }else if (zombie.y < player.y){
        zombie.y += sides.b;
      }

      /* End add or subtract values */
    }
  }
}, 1000 / 60);

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

//Clears zombies after five minutes
setInterval(() => {
  entities.zombies = {};
}, 300000);

//Spawns items
setInterval(() => {

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
  let i = new item(type(), new Date().getTime().toString());

  //Adds item to entities
  entities.items[i.id] = {
    x: i.x,
    y: i.y,
    item: i.item,
    id: i.id
  };
}, 15000);

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
