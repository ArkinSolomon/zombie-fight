/* console.js
*
* This file executes all commands issued by the console
*
*/

//External modules
const readline = require('readline');
const arkin = require('arkin');

//Where the data is stored
var data = {};

//Starts the console
module.exports.start = function(){

  //Readline declaration
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  //Starts the console
  rl.setPrompt('> ');
  rl.prompt();
  rl.on('line', (input) => {

    /* Checks commands */

    switch(input){
      case 'data': //Logs data to console
      case 'log':
      case 'print':
        console.log('\x1b[35m\n', data.time.timestamp, '\x1b[0m');
        console.log(require('util').inspect(data, false, null, true));
        break;
      case 'clear zombies': //Clears all zombies
        data.entities.zombies = {};
        console.log('Cleared all zombies');
        break;
      case 'clear items': //Clears all items
        data.entities.items = {};
        console.log('Cleared all items');
        break;
      case 'clear players': //Clears all players
        for (let p in Object.keys(data.entities.players)){
          data.entities.players[p].dead = true;
        }
        console.log('Cleared all players');
        break;
      case 'clear': //Clears all entities
      case 'clear all':
        for (let p in Object.keys(data.entities.players)){
          data.entities.players[p].dead = true;
        }
        data.entities.zombies = {};
        data.entities.items = {};
        console.log('Cleared all entities');
        break;
      case 'end': //Shuts down the server
      case 'stop':
        rl.close();
        console.log(`Server shutting down after ${data.time.serverRunTime}`);
        arkin.end();
        break;
      case 'timestamp': //Displays timestamp
      case 'time':
        console.log('\x1b[35m', data.time.timestamp, '\x1b[0m');
        break;
      case 'help': //Displays the help page
        console.log
        (`
#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-HELP-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#
data              Logs all data to the console with a timestamp

timestamp,        Displays timestamp
time

list <ENTITY>     Lists all of that type of entity

heal <PLAYER>     Heals a certain player

clear all,        Clears all entities
clear

clear players     Clears all players

clear zombies     Clears all zombies

clear items       Clears all items

end,              Shuts down the server and ends the process with exit code 1
stop

        `);
        break;
      default: //If the command has parameters

        //Commands
        if (input.startsWith('heal ')){
          let player = input.replace('heal ', '');
          data.entities.players[player].health = 100;
          console.log(`Healed ${player}`);
        }else if (input.startsWith('list ')) {
          let toList = input.replace('list ', '');
          if (toList.length === 0){
            console.log("Parameter <ENTITY> not provided");
          }else{
            if (!toList.endsWith('s')){
              toList += 's';
            }
            var listString = toList.charAt(0).toUpperCase() + toList.slice(1) + '\n';
            for (let obj in data.entities[toList]){
              listString += obj + '\n';
            }
            console.log(listString);
          }
        }else if (input !== ''){
          console.log('Enter a valid command, do "help" to see all valid commads');
        }
    }

    /* End checks commands*/

    rl.prompt();
  });
}

//Updates data
module.exports.update = function(sent){
  data = sent;
}
