/* console.js
*
* This file executes all commands issued by the console
*
*/

//External modules
const readline = require('readline');
const arkin = require('arkin');
const si = require('systeminformation');

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
          delete data.entities.players[p];
        }
        console.log('Cleared all players');
        break;
      case 'clear': //Clears all entities
      case 'clear all':
        for (let p in Object.keys(data.entities.players)){
          delete data.entities.players[p];
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
      case 'info': //Displays hardware information
      case 'information':
      case 'systeminformation':
      case 'system':
      case 'si':
        si.system((system) => {
          si.cpu((cpu) => {
            console.log
            (`
#-#-#-#-#-#-#-#-#-#-#-#-#-#-SYSTEM INFORMATION-#-#-#-#-#-#-#-#-#-#-#-#-#-#
Manufacturer:                 ${system.manufacturer}
Model:                        ${system.model}
Version:                      ${system.version}
Serial:                       ${system.serial}
UUID:                         ${system.uuid}
SKU:                          ${system.sku}

#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-CPU INFORMATION-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#
Manufacturer:                 ${cpu.manufacturer}
Brand:                        ${cpu.brand}
Speed:                        ${cpu.speed}
Cores:                        ${cpu.cores}
Family:                       ${cpu.family}
            `);
            rl.prompt();
          });
        });
        break;
      case 'help': //Displays the help page
      case 'h':
        console.log
        (`
#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-HELP-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#-#
data,                      Logs all data to the console with a timestamp
print,
log

timestamp,                 Displays timestamp
time

list <ENTITY>              Lists all of that type of entity

heal <PLAYER>              Heals a certain player

clear all,                 Clears all entities
clear

clear players              Clears all players

clear zombies              Clears all zombies

clear items                Clears all items

help,                      Displays the help page (this page)
h

rule <RULE> <VALUE>        Changes the value of a rule

systeminformation,         Displays the hardware information
system,
information,
info,
si

end,                       Shuts down the server and ends the process with
stop                       exit code 0
        `);
        break;
      default: //If the command has parameters

        /* Parameter commands */

        if (input.startsWith('heal')){
          if (input.endsWith('l') || input.endsWith(' ')){
            console.log("Parameter <PLAYER> not provided");
          }else{
            let player = input.replace('heal ', '');
            data.entities.players[player].health = 100;
            console.log(`Healed ${player}`);
          }
        }else if (input.startsWith('list')) {
          let toList = input.replace('list ', '');
          if (toList.length === 0 || input.endsWith('t')){
            console.log("Parameter <ENTITY> not provided");
          }else{
            if (!toList.endsWith('s')){
              toList += 's';
            }
            var listString = `\x1b[93m${toList.charAt(0).toUpperCase() + toList.slice(1)}\x1b[0m\n`;
            for (let obj in data.entities[toList]){
              listString += obj + '\n';
            }
            console.log(listString);
          }
        }else if (input.startsWith('rule')){
          if (!input.endsWith('rule ')){
            let ruleToUpdate = input.replace('rule ', '');
            if (ruleToUpdate.length === 0){
              console.log("Parameter <RULE> not provided");
            }else{
              let ruleToUpdateArr = ruleToUpdate.split(' ');
              if (ruleToUpdate < 2){
                console.log("Parameter <VALUE> not provided");
              }else if (ruleToUpdateArr.length > 2){
                console.log("Too many parameters");
              }else{
                if (Object.keys(data.rules).indexOf(ruleToUpdateArr[0]) !== -1){
                  let prevVal = arkin.toBoolean(ruleToUpdateArr[1], true);
                  var val;
                  if (typeof prevVal === 'string'){
                    val = parseFloat(prevVal);
                  }else{
                    val = prevVal;
                  }
                  data.rules[ruleToUpdateArr[0]] = val;
                  console.log(`Rule ${ruleToUpdateArr[0]} has been set to ${val}`);
                }else{
                  console.log(`Rule ${ruleToUpdateArr[0]} is not a valid rule`);
                }
              }
            }
          }else{
            console.log("Parameter <RULE> not provided");
          }
        } else if (input !== ''){
          console.log('Enter a valid command, do "help" to see all valid commads');
        }

        /* End parameter commands */

    }

    /* End checks commands*/

    if (input === 'systeminformation' || input === 'si' || input === 'info' || input === 'system' || input === 'information'){

    }else{
      rl.prompt();
    }
  });
}

//Updates data
module.exports.update = function(sent){
  data = sent;
}
