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

//Array of walls
var allWalls = [];

//Creates map
module.exports.createMap = function(arkin, callback){

  //Removes map
  fs.unlink('./map/map.json', (err) => {

    //Catches error not found
    if (err){
      console.log(`MAP FILE NOT FOUND. SKIPING DELETION`);
    }

    fs.unlink('./map/walls.json', (err) =>{

      //Catches error not found
      if (err){
        console.log(`MAP FILE NOT FOUND. SKIPING DELETION`);
      }

      //Where the map data is stored
      var main = {
        map: [],
        walls: []
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
          value: Number(tileData[1]),
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

      arkin.sleep(1000);

      //Loops through all tiles
      for (let t in main.map){
        let tile = main.map[t];

        //Checks if it is a wall
        if (tile.value === 1){

          //Creates new wall { minX, minY, maxX, maxY }
          var newWall = [tile.x, tile.y, tile.x + 30, tile.y + 30];

          //Pushes wall
          main.walls.push(newWall);

          //Logs the wall
          console.log(newWall);
        }
      }

      //Writes map and walls to json files
      fs.writeFileSync('./map/map.json', JSON.stringify(main.map), 'utf8');
      fs.writeFileSync('./map/walls.json', JSON.stringify(main.walls), 'utf8');

      //Logs the time it took
      console.log(`${main.map.length + main.walls.length} values written in ${(new Date().getTime() - start) / 1000} seconds`);

      callback();
    });
  });
}