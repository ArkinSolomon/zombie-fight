//External modules
const fs = require('fs');

//Creates map
module.exports.createMap = function(){

  //Gets time
  const start = new Date().getTime();

  //Removes map
  fs.unlink('map.json', (err, res) => {

    //Catches not found
    if (err){
      console.log(`MAP FILE NOT FOUND. SKIPING DELETION`);
    }

    var main = {
      map: []
    };

    const tileSize = 10;

    var nextY = 0;
    for (let createCounter = 0, xCounter = 0; nextY <= 890; createCounter += tileSize, xCounter += tileSize){
      if (xCounter >= 950){
        xCounter = 0;
        nextY += tileSize;
      }
      var x = xCounter;
      var y = nextY;

      main.map.push({
        value: 0,
        x: x,
        y: y,
        id: createCounter / tileSize
      });
      console.log({
        value: 0,
        x: x,
        y: y,
        id: createCounter / tileSize
      });
    }
    main.map.pop(-1, 0);
    fs.writeFileSync('./map.json', JSON.stringify(main), 'utf8');

    console.log(`${main.map.length} values written in ${(new Date().getTime() - start) / 1000} seconds`);
  });
}
