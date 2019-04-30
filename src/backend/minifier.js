/* src\backend\minifier.js
*
* The server-side file which minifies the file game.js, using the uglify-es API,
* so that it is easier to send to the client
*
*/

//External modules
const fs = require('fs');
const Uglify = require('uglify-es');

//Returns minified code
module.exports.minify = function(){

  //Creates a new promise
  return new Promise((resolve, reject) => {

    console.log("Started minification");

    //Gets the javascript file as a string
    fs.readFile('./src/site/scripts/javascript/game.js', 'utf8', (err, res) => {

      //Rejects errors
      if (err) reject(err);

      //Minifies code
      var minified = Uglify.minify(res);

      //Rejects errors
      if (minified.error) return reject(minified.error);

      //Writes to the file
      fs.writeFile('./src/site/scripts/javascript/game.min.js', minified.code, 'utf8', (err) => {

        //Rejects errors
        if (err) return reject(err);

        //Resolves
        console.log("Done minifying");
        resolve();
      });
    });
  });
}
