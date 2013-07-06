game-shell
==========
A generic shell for creating interactive demos/games in JavaScript.  This gives you the following features:

* A `init` event which is triggered on page load
* Virtual key bindings
* A polling interface for key and mouse states
* A request animation frame polyfill for rendering
* A frame rate independent fixed time step update loop

It is NOT:

* A full game engine
* Responsible for rendering
* An entity/component system


# Example

```javascript
var shell = require("game-shell")()

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
  shell.element.appendChild(canvas)
  context = canvas.getContext("2d")
})

//Fired once per game tick
shell.on("tick", function() {
  console.log("Tick")
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
```
[Try this example in your browser right now!](http://mikolalysenko.github.io/game-shell/)

# Install

    npm install game-shell

# API

## Constructor

### `var shell = require("game-shell")([options])`

* `element` - The DOM element to attach all input listeners to.  Can be either an element, a string representing the id, the CSS class or the element class. (defaults to creating a new element and adding to `document.body`)
* `tickRate` - The time between ticks in milliseconds (default `33`)
* `frameSkip` - The maximum alloted time between render updates (default `(tickRate+5)*5`)
* `bindings` - A default set of key bindings

## Events

### `init`
This event is fired once the document is loaded and it is safe to access the DOM

### `tick`
Called each time the game state needs to be updated.  This is not tied to rendering rate.

### `render ([frame_time])`
Called when a frame is redrawn.  The optional parameter `frame_time` is a floating point value between `0` and `1` which measures the fractional amount of frames since the last time the game was ticked.  This can be used to create smoother sub-tick animations if desired.

## Input

### `bind(virtual_key, physical_keys, ...)`
Binds a virtual key to one or more physical keys.  This is added to all previous bindings.

### `unbind(virtual_key)`
Unbinds a virtual key, removing it from the bindings object

### `keyNames`
A list of all physical key names which are supported

### `down(key)`
Tests if `key` is currently held down.  `key` can be either a physical key or a virtual key created by a binding.

### `up(key)`
Tests if `key` is not being held down.

### `press(key)`
Returns the number of times a key was pressed since last tick

### `release(key)`
Returns the number of times a key was released since last tick

### `wasDown(key)`
Returns true if the key was ever down during the last tick

### `wasUp(key)`
Returns true if the key was ever up during the last tick

### `mouseX`, `mouseY`
The x/y coordinates of the mouse relative to the element

### `prevMouseX`, `prevMouseY`
The x/y coordinates of the mouse on the previous frame.

### `scroll`
The amount the window scrolled due to mousewheel movement.  Represented as 3D array, the units are in pixels.

## Timing

### `frameSkip`
Sets the threshold for time to skip the game

### `tickCount`
A count of the total number of ticks

### `frameCount`
A count of the total number of frames rendered

### `tickTime`
A weighted average of the time required to update the game state in milliseconds

### `frameTime`
A weighted average of the time required per frame in milliseconds

### `startTime`
The time the simulation was started at in milliseconds

## Miscellaneous

### `paused`
If set, then the game is paused and no tick events are fired.  You can pause the game by assigning to this variable:

```javascript
//Pause the game
shell.paused = true

//Unpause the game
shell.paused = false
```

### `bindings`
An object which lists all of the physical keys which each virtual key is bound to.

### `element`
The DOM element associated with the shell

# Credits
(c) 2013 Mikola Lysenko. MIT License