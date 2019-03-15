//Renders the image
function render(map, ctx){
  for (m in map){
    var tile = map[m];
    ctx.strokeStyle = tile.color;
    ctx.fillRect(tile.x, tile.y, 30, 30);
  }
}
