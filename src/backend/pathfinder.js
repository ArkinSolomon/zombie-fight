/* pathfinding.js
*
* The server-side file which has the pathfinding math functions
*
*/

//External modules
const fs = require('fs');
const path = require('path');

//Exports
module.exports.findDegrees = findDegrees;
module.exports.findQuadrant = findQuadrant;
module.exports.checkCollideAllWalls = checkCollideAllWalls;
module.exports.wallIsCollide = wallIsCollide;
module.exports.checkIsWithin = checkIsWithin;
module.exports.pointsOnSlope = pointsOnSlope;
module.exports.getMoveTo = getMoveTo;
module.exports.toRad = toRad;
module.exports.toDeg = toDeg;

//Gets walls
var walls = JSON.parse(fs.readFileSync('./src/map/walls.zfm'));

//Pathfinding for zombies
function getMoveTo(from, to, speed, radius){

  //Variable initialization
  var potentialPoints = pointsOnSlope(from, findDegrees(from, to), speed);
  var isCollide = checkCollideAllWalls(potentialPoints, radius);

  //Checks if there is a wall
  if (isCollide){
    var quadrant = findQuadrant(from, to);
    potentialPoints = [];

    //Tries different sides
    if (quadrant === 'line'){
      if ((from[1] < to[1] && from[0] === to[0]) || (from[1] > to[1] && from[0] == to[0])){
        potentialPoints = [from[0], from[1] + speed];
        if (!checkCollideAllWalls(potentialPoints, radius)){
          return potentialPoints;
        }else{
          potentialPoints = [from[0], from[1] - speed];
          if (!checkCollideAllWalls(potentialPoints, radius)){
            return potentialPoints;
          }else{
            potentialPoints = [from[0] + speed, from[1]];
            if (!checkCollideAllWalls(potentialPoints, radius)){
              return potentialPoints;
            }else{
              potentialPoints = [from[0] - speed, from[1]];
              if (!checkCollideAllWalls(potentialPoints, radius)){
                return potentialPoints;
              }
            }
          }
        }
      }else if ((from[1] === to[1] && from[0] < to[0]) || (from[1] === to[1] && from[0] > to[0])){
        potentialPoints = [from[0] + speed, from[1]];
        if (!checkCollideAllWalls(potentialPoints, radius)){
          return potentialPoints;
        }else{
          potentialPoints = [from[0] - speed, from[1]];
          if (!checkCollideAllWalls(potentialPoints, radius)){
            return potentialPoints;
          }else{
            potentialPoints = [from[0], from[1] + speed];
            if (!checkCollideAllWalls(potentialPoints, radius)){
              return potentialPoints;
            }else{
              potentialPoints = [from[0], from[1] - speed];
              if (!checkCollideAllWalls(potentialPoints, radius)){
                return potentialPoints;
              }
            }
          }
        }
      }
    }
  }else if (!isCollide){
    return potentialPoints;
  }
}

//Finds the degrees between two points
function findDegrees(from, to){

  //Variable initialization
  var quadrant = findQuadrant(from, to);
  var degrees = undefined;
  var delta1 = Math.abs(from[0] - to[0]);
  var delta2 = Math.abs(from[1] - to[1]);
  var newPoint = [0, 0];

  //Finds quadrant or returns degrees if it is on a line
  switch (quadrant) {
    case 'line':
      if (from[1] === to[1] && from[0] < to[0]){
        degrees = 360;
      }else if (from[1] < to[1] && from[0] === to[0]){
        degrees = 90;
      }else if (from[1] === to[1] && from[0] > to[0]){
        degrees = 180;
      }else if (from[1] > to[1] && from[0] === to[0]){
        degrees = 270;
      }
      break;
    case 'I':
      newPoint[0] += delta1;
      newPoint[1] += delta2;
      break;
    case 'II':
      newPoint[0] -= delta1;
      newPoint[1] += delta2;
      break;
    case 'III':
      newPoint[0] -= delta1;
      newPoint[1] -= delta2;
      break;
    case 'IV':
      newPoint[0] += delta1;
      newPoint[1] -= delta2;
      break;
  }

  if ((!degrees && typeof degrees === 'undefined') || quadrant === 'line'){

    //Gets degrees [ toDeg(arctan(y, x)) ]
    degrees = toDeg(Math.atan2(newPoint[1], newPoint[0]));

    //Sets degrees to positive
    if (degrees < 0){
      degrees += 360;
    }
  }
  return degrees;
}

//Gets new points on slope { x, y }
function pointsOnSlope(currPoint, degrees, distance){

  //Variable initialization
  var newPoints = [null, null];
  var rad = toRad(degrees);

  //Finds new y [ hypotenuse * sin(degrees) ]
  newPoints[1] = distance * Math.sin(rad);

  //Finds new x [ hypotenuse * cos(degrees) ]
  newPoints[0] = distance * Math.cos(rad);

  return newPoints;
}

//Finds which quadrant a point is in realation to another point on the unit circle
function findQuadrant(from, to){

  //Returns if on line
  if ((from[1] === to[1] && from[0] < to[0]) || (from[1] < to[1] && from[0] === to[0]) || (from[1] === to[1] && from[0] > to[0]) || (from[1] > to[1] && from[0] === to[0])) return 'line';

  //Finds quadrant
  if (from[0] < to[0] && from[1] > to[1]) return 'I';
  if (from[0] > to[0] && from[1] > to[1]) return 'II';
  if (from[0] > to[0] && from[1] < to[1]) return 'III';
  if (from[0] < to[0] && from[1] < to[1]) return 'IV';
}

//Checks tiles for walls
function checkCollideAllWalls(points, radius, zombie){

  //Variable to return
  var isWall = false;

  //Loops through all walls
  for (let w in walls){
    var wall = walls[w];

    //Checks if all variables are present
    if (wall[0] && wall[1] && wall[2] && wall[3] && points[0] && points[1]){

      //Gets the four outside points of the entity
      var ePoints = {
        top: [points[0], points[1] - radius],
        right: [points[0] + radius, points[1]],
        bottom: [points[0], points[1] + radius],
        left: [points[0] - radius, points[1]]
      };

      //Loops through all points
      for (let e in ePoints){

        //Checks collison
        if (wallIsCollide(ePoints[e], wall)){
          isWall = true;
          break;
        }
      }
      if (isWall) break;
    }
  }
  return isWall;
}

//Checks if an entity collides with a wall
function wallIsCollide(points, wall){

  //Checks collison
  if (checkIsWithin(points[0], [wall[0], wall[2]]) && checkIsWithin(points[1], [wall[1], wall[3]])){
    return true;
  }else{
    return false;
  }
}

//Checks if a number is between two values
function checkIsWithin(n, arr){
  return (arr[0] < n && arr[1] > n);
}

//Converts degrees to radians [ degrees * 3.14159... / 180 ]
function toRad(degrees){
  return degrees * Math.PI / 180;
}

//Converts radians to degrees [ radians * 180 / 3.14159... ]
function toDeg(radians){
  return radians * 180 / Math.PI;
}
