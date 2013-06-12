var shell = require("../shell")()

var context
  , player_x = 250
  , player_y = 250

//Bind keyboard commands
shell.bind("move-left", "left", "A")
shell.bind("move-right", "right", "D")
shell.bind("move-up", "up", "W")
shell.bind("move-down", "down", "S")

//Fired when document is loaded
shell.on("init", function() {
  var canvas = document.createElement("canvas")
  canvas.width = 500
  canvas.height = 500
  document.body.appendChild(canvas)
  context = canvas.getContext("2d")
})

//Fired once per game tick
shell.on("tick", function() {
  if(shell.wasDown("move-left")) {
    player_x -= 1
  }
  if(shell.wasDown("move-right")) {
    player_x += 1
  }
  if(shell.wasDown("move-up")) {
    player_y -= 1
  }
  if(shell.wasDown("move-down")) {
    player_y += 1
  }
})

//Render a frame
shell.on("render", function(frame_time) {
  context.fillStyle = "#000"
  context.fillRect(0, 0, 500, 500)
  
  context.fillStyle = "#f00"
  context.fillRect(player_x-10, player_y-10, 20, 20)
})
