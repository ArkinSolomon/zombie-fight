//External modules
const fs = require('fs');

//Gets map string
const mapArray = fs.readFileSync('./mapString.txt', 'utf8').replace('\n', '').split('<<<!>>>');

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
      map: ['\n']
    };

    const tileSize = 30;

    var nextY = 0;
    for (let createCounter = 0, xCounter = 0, mainCounter = 0; nextY <= 900 - tileSize; createCounter += tileSize, xCounter += tileSize, mainCounter){
      var newLine = '';
      if (xCounter >= 960 - tileSize){
        xCounter = 0;
        nextY += tileSize;
        newLine = '\n';
      }

      var x = xCounter;
      var y = nextY;

      var pushing = '#ffffff<<<!>>>' + newLine;

      // var pushing = {
      //   value: 0,
      //   color: mapArray[mainCounter]
      //   x: x,
      //   y: y,
      //   id: createCounter / tileSize
      // }

      main.map.push(pushing);

      console.log(pushing);
    }
    main.map.pop(-1, 0);
    main.map = main.map.join('');
    fs.writeFileSync('./mapString.txt', main.map, 'utf8');

    console.log(`${main.map.length} values written in ${(new Date().getTime() - start) / 1000} seconds`);
  });
}
