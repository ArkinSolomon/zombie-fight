/* createMap.js
*
* The server-side file which turns the map string of the file into usable data.
*
*/

//External modules
const fs = require('fs');
const arkin = require('arkin');

//Tile size
const tileSize = 15;
const maxXTiles = 960 / tileSize;
const initialNextId = maxXTiles;

//Creates map
module.exports.createMap = function(callback){

  //Gets time
  const start = new Date().getTime();

  //Gets map string
  const mapString = fs.readFileSync('./src/map/map.zfms', 'utf8');

  //Makes the string into an array
  const mapArray = mapString.split('%');

  //Array of walls
  var allWalls = [];

  //Removes map
  fs.unlink('./src/map/map.zfm', (err) => {

    //Catches error not found
    if (err){
      console.log(`MAP FILE NOT FOUND. SKIPING DELETION`);
    }

    fs.unlink('./src/map/walls.zfm', (err) =>{

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
          nextId += maxXTiles;
          x = 0;
          y += tileSize
        }else{
          x += tileSize;
        }

        //Removes new line
        var tileOption = mapArray[t].replace(/(\r\n|\n|\r)/gm, '');

        //Splits text into an array for data
        var tileData = tileOption.split('&');

        //Creates new tile
        var newTile = {
          id: id,
          x: x,
          y: y,
          value: (Number(tileData[1])) ? Number(tileData[1]) : 0,
          color: '#' + tileData[0]
        };

        //Doesn't push last tile because it is a blank string
        if (id !== 3840){

          //Pushes the tile
          main.map.push(newTile);
        }else{
          break;
        }

        // Increases id
        id++;
      }

      //Loops through all tiles
      for (let t in main.map){
        let tile = main.map[t];

        //Checks if it is a wall
        if (tile.value === 1){

          //Creates new wall { minX, minY, maxX, maxY }
          var newWall = [tile.x, tile.y, tile.x + tileSize, tile.y + tileSize];

          //Pushes wall
          main.walls.push(newWall);
        }
      }

      //Writes map and walls to json files
      fs.writeFileSync('./src/map/map.zfm', JSON.stringify(main.map, null, 4), 'utf8');
      fs.writeFileSync('./src/map/walls.zfm', JSON.stringify(main.walls, null, 4), 'utf8');

      //Logs the time it took
      console.log(`Map parsed: ${main.map.length + main.walls.length} values written in ${(new Date().getTime() - start) / 1000} seconds`);

      callback();
    });
  });
}
