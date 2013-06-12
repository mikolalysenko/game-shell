"use strict"

var EventEmitter = require("events").EventEmitter
  , util         = require("util")
  , domready     = require("domready")
  , vkey         = require("vkey")
  , invert       = require("invert-hash")
  , uniq         = require("uniq")
  , lowerBound   = require("lower-bound")
  , iota         = require("iota-array")
  , min          = Math.min

require("./lib/raf-polyfill.js")

//Remove angle braces and other useless crap
var filtered_vkey = (function() {
  var result = new Array(256)
    , i, j, k
  for(i=0; i<256; ++i) {
    result[i] = "UNK"
  }
  for(i in vkey) {
    k = vkey[i]
    if(k.charAt(0) === '<' && k.charAt(k.length-1) === '>') {
      k = k.substring(1, k.length-1)
    }
    k = k.replace(/\s/g, "-")
    result[parseInt(i)] = k
  }
  return result
})()

//Compute minimal common set of keyboard functions
var keyNames = uniq(Object.keys(invert(filtered_vkey)))

//Translates a virtual keycode to a normalized keycode
function virtualKeyCode(key) {
  var idx = lowerBound(keyNames, key)
  if(idx < 0 || idx >= keyNames.length) {
    return -1
  }
  return idx
}

//Maps a physical keycode to a normalized keycode
function physicalKeyCode(key) {
  return virtualKeyCode(filtered_vkey[key])
}

//Game shell
function GameShell() {
  EventEmitter.call(this)
  this._curKeyState  = new Array(keyNames.length)
  this._pressCount   = new Array(keyNames.length)
  this._releaseCount = new Array(keyNames.length)
  
  this._tickInterval = null
  this._tickRate = 0
  this._lastTick = Date.now()
  this._frameTime = 0.0
  this._paused = false
  
  this._render = render.bind(undefined, this)
  
  for(var i=0; i<keyNames.length; ++i) {
    this._curKeyState[i] = false
    this._pressCount[i] = this._releaseCount[i] = 0
  }
  
  //Public members
  this.element = null
  this.bindings = {}
  this.frameSkip = 100.0
  this.tickCount = 0
  this.frameCount = 0
  this.startTime = Date.now()
  this.tickTime = this._tickRate
  this.frameTime = 10.0
  
  //Mouse state
  this.mouseX = 0
  this.mouseY = 0
  this.prevMouseX = 0
  this.prevMouseY = 0
}

util.inherits(GameShell, EventEmitter)

//Bind keynames
GameShell.prototype.keyNames = keyNames

//Binds a virtual keyboard event to a physical key
GameShell.prototype.bind = function(virtual_key) {
  //Look up previous key bindings
  var arr
  if(virtual_key in this.bindings) {
    arr = this.bindings[virtual_key]
  } else {
    arr = []
  }
  //Add keys to list
  var physical_key
  for(var i=1, n=arguments.length; i<n; ++i) {
    physical_key = arguments[i]
    if(virtualKeyCode(physical_key) >= 0) {
      arr.push(physical_key)
    }
  }
  //Remove any duplicate keys
  arr = uniq(arr)
  if(arr.length > 0) {
    this.bindings[virtual_key] = arr
  }
}

//Unbinds a virtual keyboard event
GameShell.prototype.unbind = function(virtual_key) {
  if(virtual_key in this.bindings) {
    delete this.bindings[virtual_key]
  }
}

//Checks if a key is set in a given state
function lookupKey(state, bindings, key) {
  if(key in bindings) {
    var arr = bindings[key]
    for(var i=0, n=arr.length; i<n; ++i) {
      if(state[virtualKeyCode(arr[i])]) {
        return true
      }
    }
    return false
  }
  var kc = virtualKeyCode(key)
  if(kc >= 0) {
    return state[kc]
  }
  return false
}

//Checks if a key is set in a given state
function lookupCount(state, bindings, key) {
  if(key in bindings) {
    var arr = bindings[key], r = 0
    for(var i=0, n=arr.length; i<n; ++i) {
      r += state[virtualKeyCode(arr[i])]
    }
    return r
  }
  var kc = virtualKeyCode(key)
  if(kc >= 0) {
    return state[kc]
  }
  return 0
}

//Checks if a key (either physical or virtual) is currently held down
GameShell.prototype.down = function(key) {
  return lookupKey(this._curKeyState, this.bindings, key)
}

//Checks if a key was ever down
GameShell.prototype.wasDown = function(key) {
  return this.down(key) || this.press(key)
}

//Opposite of down
GameShell.prototype.up = function(key) {
  return !this.down(key)
}

GameShell.prototype.wasUp = function(key) {
  return this.up(key) || this.release(key)
}

//Returns the number of times a key was pressed since last tick
GameShell.prototype.press = function(key) {
  return lookupCount(this._pressCount, this.bindings, key)
}

//Returns the number of times a key was released since last tick
GameShell.prototype.release = function(key) {
  return lookupCount(this._releaseCount, this.bindings, key)
}

//Pause/unpause the game loop
Object.defineProperty(GameShell.prototype, "paused", {
  get: function() {
    return this._paused
  },
  set: function(p) {
    if(p) {
      if(!this._paused) {
        this._paused = true
        this._frameTime = min(1.0, (Date.now() - this._lastTick) / this._tickRate)
      }
    } else if(this._paused) {
      this._paused = false
      this._lastTick = Date.now() - Math.floor(this._frameTime * this._tickRate)
    }
  }
})

//Set key state
function setKeyState(shell, key, state) {
  var ps = shell._curKeyState[key]
  if(ps !== state) {
    if(state) {
      shell._pressCount[key]++
    } else {
      shell._releaseCount[key]++
    }
    shell._curKeyState[key] = state
  }
}

//Ticks the game state one update
function tick(shell) {
  var skip = Date.now() + shell.frameSkip
    , pCount = shell._pressCount
    , rCount = shell._releaseCount
    , i, s, t
    , tr = shell._tickRate
    , n = keyNames.length
  while(!shell._paused &&
        Date.now() >= shell._lastTick + tr) {
    //Skip a frame if we are over budget
    if(Date.now() > skip) {
      shell._lastTick = Date.now() + tr
      return
    }
    
    //Update counters and time
    ++shell.tickCount
    shell._lastTick += tr
    
    //Tick the game
    s = Date.now()
    shell.emit("tick")
    t = Date.now()
    shell.tickTime = shell.tickTime * 0.3 + (t - s) * 0.7
    
    //Shift input state
    for(i=0; i<n; ++i) {
      pCount[i] = rCount[i] = 0
    }
    shell.prevMouseX = shell.mouseX
    shell.prevMouseY = shell.mouseY
  }
}

//Render stuff
function render(shell) {
  //Tick the shell
  tick(shell)
  
  //Compute frame time
  var dt
  if(shell._paused) {
    dt = shell._frameTime
  } else {
    dt = min(1.0, (Date.now() - shell._lastTick) / shell._tickRate)
  }
  
  //Draw a frame
  ++shell.frameCount
  var s = Date.now()
  shell.emit("render", dt)
  var t = Date.now()
  shell.frameTime = shell.frameTime * 0.3 + (t - s) * 0.7
  
  //Request next frame
  requestAnimationFrame(shell._render)
}

//Set key up
function handleKeyUp(shell, ev) {
  var kc = physicalKeyCode(ev.keyCode || ev.which || ev.charCode)
  if(kc >= 0) {
    setKeyState(shell, kc, false)
  }
}

//Set key down
function handleKeyDown(shell, ev) {
  var kc = physicalKeyCode(ev.keyCode || ev.char || ev.which || ev.charCode)
  if(kc >= 0) {
    setKeyState(shell, kc, true)
  }
}

var mouseCodes = iota(5).map(function(n) {
  return virtualKeyCode("mouse-" + (n+1))
})

function setMouseButtons(shell, buttons) {
  for(var i=0; i<5; ++i) {
    setKeyState(shell, mouseCodes[i], !!(buttons & (1<<i)))
  }
}

function handleMouseMove(shell, ev) {
  if(ev.which !== undefined) {
    setMouseButtons(shell, ev.which)
  }
  if(ev.buttons !== undefined) {
    setMouseButtons(shell, ev.buttons)
  }
  shell.mouseX = ev.clientX
  shell.mouseY = ev.clientY
}

function handleMouseDown(shell, ev) {
  handleMouseMove(shell, ev)
  setKeyState(shell, mouseCodes[ev.button], true)
}

function handleMouseUp(shell, ev) {
  handleMouseMove(shell, ev)
  setKeyState(shell, mouseCodes[ev.button], false)
}

function handleMouseEnter(shell, ev) {
  handleMouseMove(shell, ev)
  shell.prevMouseX = shell.mouseX = ev.clientX
  shell.prevMouseY = shell.mouseY = ev.clientY
}

function handleMouseLeave(shell, ev) {
  for(var i=0; i<5; ++i) {
    setKeyState(shell, mouseCodes[i], false)
  }
}

function handleBlur(shell, ev) {
  var n = keyNames.length
    , c = shell._curKeyState
    , i
  for(i=0; i<n; ++i) {
    c[i] = false
  }
}

function makeDefaultContainer() {
  var container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "0px"
  container.style.right = "0px"
  container.style.top = "0px"
  container.style.bottom = "0px"
  document.body.appendChild(container)
  return container
}

function createShell(options) {
  options = options || {}
  
  //Create initial shell
  var shell = new GameShell()
  shell._tickRate = options.tickRate || 30
  shell.frameSkip = options.frameSkip || (shell._tickRate+5) * 5
  
  //Set bindings
  if(options.bindings) {
    shell.bindings = bindings
  }
  
  //Wait for dom to intiailize
  setTimeout(function() { domready(function() {
    
    //Retrieve element
    var element = options.element
    if(typeof element === "string") {
      var e = document.getElementById(element)
      if(!e) {
        e = document.querySelector(element)
      }
      if(!e) {
        e = document.getElementByClass(element)[0]
      }
      if(!e) {
        e = makeDefaultContainer()
      }
      shell.element = e
    } else if(typeof element === "object" && !!element) {
      shell.element = element
    } else if(typeof element === "function") {
      shell.element = element()
    } else {
      shell.element = makeDefaultContainer()
    }
    
    //Disable user-select
    if(shell.element.style) {
      shell.element.style["-webkit-touch-callout"] = "none"
      shell.element.style["-webkit-user-select"] = "none"
      shell.element.style["-khtml-user-select"] = "none"
      shell.element.style["-moz-user-select"] = "none"
      shell.element.style["-ms-user-select"] = "none"
      shell.element.style["user-select"] = "none"
    }
    
    //Hook input listeners
    window.addEventListener("keydown", handleKeyDown.bind(undefined, shell), true)
    window.addEventListener("keyup", handleKeyUp.bind(undefined, shell), true)
    window.addEventListener("mousedown", handleMouseDown.bind(undefined, shell), true)
    window.addEventListener("mouseup", handleMouseUp.bind(undefined, shell), true)
    window.addEventListener("mousemove", handleMouseMove.bind(undefined, shell), true)
    window.addEventListener("mouseleave", handleMouseLeave.bind(undefined, shell), true)
    window.addEventListener("mouseenter", handleMouseEnter.bind(undefined, shell), true)
    window.addEventListener("blur", handleBlur.bind(undefined, shell), true)
    
    //Initialize tick counter
    shell._lastTick = Date.now()
    shell._paused = false
    shell.startTime = Date.now()
    
    //Set up a tick interval
    shell._tickInterval = setInterval(tick, shell._tickRate, shell)
    
    //Create an animation frame handler
    requestAnimationFrame(shell._render)
    
    //Emit initialize event
    shell.emit("init")
  })}, 0)
  
  return shell
}

module.exports = createShell