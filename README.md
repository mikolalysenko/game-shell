game-shell
==========
A generic shell for creating interactive demos/games in JavaScript.  This gives you the following features:

* A `init` event which is triggered on page load
* A `render` event which is called every frame or as needed
* A frame rate independent `tick` event that is called at uniform intervals
* A `resize` event that gets called whenever the game changes size
* Virtual key bindings
* A polling interface for key and mouse states
* Wrappers for fullscreen, pointer lock and precision timing APIs

This code is compatible with [browserify](http://browserify.org/) or [beefy](https://github.com/chrisdickinson/beefy).

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
* `fullscreen` - A flag which if set attempts to put the game in fullscreen mode
* `pointerLock` - A flag which if set attempts to active pointer pointer lock (default true  for fullscreen, false otherwise)
* `sticky` - If set to true, then keep trying to grab fullscreen/pointerLock even if user escapes out

## Events

### `init`
This event is fired once the document is loaded and it is safe to access the DOM

### `tick`
Called each time the game state needs to be updated.  This is not tied to rendering rate.

### `render ([frame_time])`
Called when a frame is redrawn.  The optional parameter `frame_time` is a floating point value between `0` and `1` which measures the fractional amount of frames since the last time the game was ticked.  This can be used to create smoother sub-tick animations if desired.

### `resize([w,h])`
Triggered whenever the element is resized.  `w` is the new width and `h` is the new height of the element.

### `bind(virtual_key,arr)`

Emitted when `bind()` is called.

### `unbind(virtual_key)`

Emitted when `unbind()` is called.

## Input

### `wasDown(key)`
Returns true if the key was ever down during the last tick

### `wasUp(key)`
Returns true if the key was ever up during the last tick

### `press(key)`
Returns the number of times a key was pressed since last tick

### `release(key)`
Returns the number of times a key was released since last tick

### `mouseX`, `mouseY`
The x/y coordinates of the mouse relative to the element

### `prevMouseX`, `prevMouseY`
The x/y coordinates of the mouse on the previous frame.

### `scroll`
The amount the window scrolled due to mousewheel movement.  Represented as 3D array, the units are in pixels.

### `bind(virtual_key, physical_keys, ...)`
Binds a virtual key to one or more physical keys.  This is added to all previous bindings.

### `unbind(virtual_key)`
Unbinds a virtual key, removing it from the bindings object

### `keyNames`
A list of all physical key names which are supported

### `bindings`
An object which lists all of the physical keys which each virtual key is bound to.  This can be used to save key state

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

### `fullscreen`
Sets or tests whether the game is fullscreen

### `stickyFullscreen`
If set try to continuously reacquire fullscreen

### `pointerLock`
Sets or tests whether the game has a pointer lock

### `stickyPointerLock`
If set try to continuously reacquire pointer lock

### `element`
The DOM element associated with the shell

### `width`
The width of the element contained by the shell

### `height`
The height of the element contained by the shell

### `preventDefaults`
If set, trap event default behaviors.  (Good for fullscreen apps, can be annoying for some embedded applications). Default set to `true`

### `stopPropagation`
If set, don't propagate events like scrolling.  Default `false`


# Credits
(c) 2013 Mikola Lysenko. MIT License
