//Gets time
const start = new Date().getTime();

//External modules
const fs = require('fs');

//Gets map string
const mapString = fs.readFileSync('./map/mapString.txt', 'utf8');

//Makes the string into an array
const mapArray = mapString.split('.');

//Tile size
const tileSize = 30;
const initialNextId = 960 / 30;

//Creates map
module.exports.createMap = function(callback){

  //Removes map
  fs.unlink('./map/map.json', (err, res) => {

    //Catches error not found
    if (err){
      console.log(`MAP FILE NOT FOUND. SKIPING DELETION`);
    }

    //Where the map data is stored
    var main = {
      map: []
    };

    //Id definitions
    var id = 0;
    var nextId = initialNextId;

    //Position definitions
    var x = 0 - tileSize;
    var y = 0;

    //Loops through tiles
    for (t in mapArray){

      //Resets x if nessecary and increases y if nessecary
      if (id >= nextId){
        nextId += 32;
        x = 0;
        y += tileSize
      }else{
        x += tileSize;
      }

      //Removes new line
      var tileOption = mapArray[t].replace('\n', '');

      //Splits text into an array for data
      var tileData = tileOption.split('&');

      //Creates new tile
      var newTile = {
        id: id,
        x: x,
        y: y,
        value: tileData[1],
        color: tileData[0]
      };

      //Doesn't push last tile because it is a blank string
      if (id !== 960){

        //Pushes the tile
        main.map.push(newTile);

        //Logs the tile
        console.log(newTile);
      }

      //Increases id
      id++;
    }

    //Writes map to json file
    fs.writeFileSync('./map/map.json', JSON.stringify(main.map), 'utf8');

    //Logs the time it took
    console.log(`${main.map.length} values written in ${(new Date().getTime() - start) / 1000} seconds`);

    //Gets all walls
    var walls = function(){

      //Array of walls
      var allWalls = [];

      //Loops through all walls
      for (let w in walls){
        var wall = map[w];

        //Checks if it is a wall
        if (wall.value === 1){

          //Pushes walls boundries { minX, minY, maxX, maxY }
          allWalls.push([wall.x, wall.y, wall.x + 30, wall.y + 30]);
        }
      }
      return allWalls;
    }

    //Callback
    callback(walls());
  });
}
