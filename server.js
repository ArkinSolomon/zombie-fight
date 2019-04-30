/* server.js
*
* The server-side file which contains the server as well as all of the game
* logic, which includes: parsing map data, handling movement, pathfinding, item
* and zombie spawning, and entity collision.
*
*/

//Time of server start
const startTime = new Date().getTime();

//Doesn't stop program on error
process.on('uncaughtException', console.log);

//Port for server
const port = 5000;

//Framerate
const fps = 60;
const framerate = 1000 / fps;

//External modules
const arkin = require('arkin');
const fs = require('fs');

/* Code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

//Changes directory
process.chdir(path.resolve(__dirname));

//Internal modules
const {createMap} = require('./src/map/createMap.js');
const {minify} = require('./src/backend/minifier.js');
const gameConsole = require('./src/backend/console.js');
const Pathfinder = require('./src/backend/pathfinder.js')

//Server setup
const app = express();
const server = http.Server(app);
const io = socketIO(server);

//Emiter
const EventEmitter = require('events').EventEmitter;
const Server = new EventEmitter;
module.exports.Server = Server;

//Server setup
app.set('port', port);
app.use('/src/site', express.static(__dirname + '/src/site'));

//Pages
app.get('/', (req, res) => {
  res.redirect('/game');
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '/src/site/index.html'));
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

//Waits for one and a half seconds
arkin.sleep(1500);

var walls;
var map;

//Creates tiles
createMap(() => {

  //Parses the map
  walls = JSON.parse(fs.readFileSync('./src/map/walls.zfm', 'utf8'));
  map = JSON.parse(fs.readFileSync('./src/map/map.zfm', 'utf8'));

  //Minifies javascript
  minify()
    .then(() => {

      //Starts the server
      server.listen(port, () => {
        console.log(`Server listening on port ${port}`);

        //Starts the console
        gameConsole.start();

        //Starts spawning zombies
        spawnZombie();
      });
    })
    .catch(console.log);
});

//Main data variable
var data = {
  entities: {},
  time: {},
  rules: {
    spawnZombies: true,
    spawnItems: true,
    zombieSpeed: .8,
    itemSpawnInterval: 15000,
    zombieSpawnInterval: 10050,
    playerSpeed: .25,
    playerSprintSpeed: .5
  },
  serverData: {
    fps: fps,
    millisecondsBetweenUpdates: framerate,
    rootDirectory: __dirname,
    network: {
      port: port
    }
  }
};

//Keeps all entities
var entities = {
  players: {},
  zombies: {},
  items: {}
};

//Renders map on console command
Server.on('render', () => {
  walls = JSON.parse(fs.readFileSync('./src/map/walls.zfm'));
  map = JSON.parse(fs.readFileSync('./src/map/map.zfm', 'utf8'));

  //Gives player game data
  io.sockets.emit('get data', {
    map: JSON.stringify(map)
  });
});

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

  //Initializes player
  socket.on('new player', (constantData) => {

    players[socket.id] = {
      x: 475,
      y: 450,
      health: 100,
      damage: false,
      dead: false,
      id: socket.id,
      lives: 3,
      items: {
        healthKit: 0,
        bandage: 0
      },
      data: {
        ip: socket.handshake.address,
        joinTime: new Date().getTime(),
        username: socket.id,
        color: '#e8c28b'
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

  //Updates username
  socket.on('username', (username) => {
    if (entities.players[socket.id] && entities.players[socket.id].data){
      entities.players[socket.id].data.username = (username && entities.players[socket.id] && entities.players[socket.id].data) ? username : socket.id;
    }
  });

  //Updates color
  socket.on('color', (color) => {
    if (entities.players[color.socket] && entities.players[color.socket].data){
      entities.players[color.socket].data.color = (color && color.socket && entities.players[color.socket] && entities.players[color.socket].data) ? '#' + color.hex : '#e8c28b';
    }
  });

  //Runs on movement
  socket.on('movement', (k) => {

    //Makes a copy of the object
    let keys = JSON.parse(JSON.stringify(k));

    //Initializes player x and y
    var player = players[socket.id] || {};

    /* Movement */

    //Speed
    var speed = (keys.shift) ? data.rules.playerSprintSpeed : data.rules.playerSpeed;
    var diagonalSpeed = Math.sqrt(speed) / 2;

    //Cancels opposite movement
    if (keys.up && keys.down){
      keys.up = false;
      keys.down = false;
    }
    if (keys.left && keys.right){
      keys.left = false;
      keys.right = false;
    }

    /* Modified from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

    //Strafing
    if (keys.up && !keys.left && !keys.right && !keys.down){
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y - speed], 10)){
        player.y -= speed;
      }
    }else if (keys.left && !keys.up && !keys.right && !keys.down){
      if (!Pathfinder.checkCollideAllWalls([player.x - speed, player.y], 10)){
        player.x -= speed;
      }
    }else if (keys.down && !keys.left && !keys.right && !keys.up){
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y + speed], 10)){
        player.y += speed;
      }
    }else if (keys.right && !keys.left && !keys.up && !keys.down){
      if (!Pathfinder.checkCollideAllWalls([player.x + speed, player.y], 10)){
        player.x += speed;
      }
    }

    /* End modified code from https://hackernoon.com/how-to-build-a-multiplayer-browser-game-4a793818c29b */

    //Diagonal movement
    if (keys.up && keys.left && !keys.down && !keys.right){
      if (!Pathfinder.checkCollideAllWalls([player.x - diagonalSpeed, player.y], 10)){
        player.x -= diagonalSpeed;
      }
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y - diagonalSpeed], 10)){
        player.y -= diagonalSpeed;
      }
    }else if (keys.up && keys.right && !keys.down && !keys.left){
      if (!Pathfinder.checkCollideAllWalls([player.x + diagonalSpeed, player.y], 10)){
        player.x += diagonalSpeed;
      }
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y - diagonalSpeed], 10)){
        player.y -= diagonalSpeed;
      }
    }else if (keys.down && keys.left && !keys.up && !keys.right){
      if (!Pathfinder.checkCollideAllWalls([player.x - diagonalSpeed, player.y], 10)){
        player.x -= diagonalSpeed;
      }
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y + diagonalSpeed], 10)){
        player.y += diagonalSpeed;
      }
    }else if (keys.down && keys.right && !keys.up && !keys.left){
      if (!Pathfinder.checkCollideAllWalls([player.x + diagonalSpeed, player.y], 10)){
        player.x += diagonalSpeed;
      }
      if (!Pathfinder.checkCollideAllWalls([player.x, player.y + diagonalSpeed], 10)){
        player.y += diagonalSpeed;
      }
    }

    /* End movement */

    //Player bounding
    if (player.x > 960){
      player.x = 960;
    }else if (player.y > 900){
      player.y = 900;
    }else if (player.x < .1){
      player.x = .1;
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
    }else if (zombie.x < .1){
      zombie.x = .1;
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
        if (Pathfinder.distance(zombie1.x, zombie2.x, zombie1.y, zombie2.y) < 20){

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
          if (Pathfinder.distance(player.x, zombie.x, player.y, zombie.y) < 20){

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
    for (let p in playerArr){
      var player = playerArr[p];

      //Makes sure player is still in the game
      if (Object.keys(entities.players).indexOf(player.id) !== -1){

        //Loops through all items
        for (let i in itemArr){
          var item = itemArr[i];

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
        }
      }
    }
  }

  /* End player-item collison */

  //Checks if a zombie is dead
  for (let counter in entities.zombies){
    if (entities.zombies[counter].health <= 0){
      delete entities.zombies[counter];
    }
  }

  //Checks if a player is dead
  for (let counter in entities.players){
    if (entities.players[player.id] && entities.players[player.id].health <= 0){
      io.sockets.emit('dead', player.id);
      delete entities.players[player.id];
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

      data.rules.zombieSpawnInterval -= 10;

      //Makes zombie id
      let id = `enemy${new Date().getTime()}`;

      let points = getRandomCoords();

      //Creates zombie
      entities.zombies[id] = {
        x: points[0],
        y: points[1],
        health: 50,
        id: id
      }
    }
    spawnZombie();
  }, data.rules.zombieSpawnInterval);
}

//Increases zombie speed
setInterval(() => {
  if (data.rules.zombieSpawnInterval){
    data.rules.zombieSpeed += .02;
  }
}, 30000);

//Pathfinding
setInterval(() => {

  //Loops through all zombies
  for (let zomb in entities.zombies){
    var zombie = entities.zombies[zomb];

    //Finds the nearest player
    var player = Pathfinder.findClosestPlayer(zombie, data.entities.players).data;

    //Makes sure all variables are present
    if (Object.keys(entities.players).length > 0 && Object.keys(entities.zombies).length > 0 && player && zombie && player.x && player.y && zombie.x && zombie.y){

      //Gets translation to new point
      var moveTo = Pathfinder.getMoveTo([zombie.x, zombie.y], [player.x, player.y], data.rules.zombieSpeed, 10);

      //Checks if moveTo is not a number
      if (typeof moveTo !== 'object' || typeof moveTo[0] === 'undefined' || typeof moveTo[1] === 'undefined' || isNaN(moveTo[0]) || isNaN(moveTo[1])) return;

      //Changes location
      data.entities.zombies[zombie.id].x += moveTo[0];
      data.entities.zombies[zombie.id].y -= moveTo[1];
    }
  }
}, framerate);

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
    let i = new Item(type());

    //Adds item to entities
    entities.items[i.getName()] = i.objectify();
  }
}, data.rules.itemSpawnInterval);

//Gets random coordinates
function getRandomCoords(){
  var potentialPoints = [Math.floor(Math.random() * 951), Math.floor(Math.random() * 901)];
  while (Pathfinder.checkCollideAllWalls(potentialPoints, 10)){
    potentialPoints = [Math.floor(Math.random() * 951), Math.floor(Math.random() * 901)];
  }
  return potentialPoints;
}

//Finds values greater than and less than a given value
function plusOrMinus(val, pOrM){

  //Returns values [ value - pOrM ] [ value + pOrM ]
  return [val - pOrM, val + pOrM];
}

//Item class
class Item {
  constructor(item){
    this.id = new Date().getTime().toString();
    this.item = item;
    this.name = `item${this.id}`;
    this.coords = getRandomCoords();
    this.x = this.coords[0];
    this.y = this.coords[1];
  }

  getName(){
    return this.name;
  }

  objectify(){
    return {
      x: this.x,
      y: this.y,
      item: this.item,
      name: this.name,
      id: this.id,
      timeRemaining: 60000
    };
  }
}
