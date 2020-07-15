'use strict'

function Cursor (client) {
  this.x = 0
  this.y = 0
  this.w = 0
  this.h = 0

  this.minX = 0
  this.maxX = 0
  this.minY = 0
  this.maxY = 0

  this.ins = false
	this.detailLevel = 1

  this.start = () => {
    document.onmousedown = this.onMouseDown
    document.onmouseup = this.onMouseUp
    document.onmousemove = this.onMouseMove
    document.oncopy = this.onCopy
    document.oncut = this.onCut
    document.onpaste = this.onPaste
    document.oncontextmenu = this.onContextMenu
  }

  this.select = (x = this.x, y = this.y, w = this.w, h = this.h) => {
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) { return }
    const rect = { x: clamp(parseInt(x), 0, client.orca.w - 1), y: clamp(parseInt(y), 0, client.orca.h - 1), w: clamp(parseInt(w), -this.x, client.orca.w - 1), h: clamp(parseInt(h), -this.y, client.orca.h - 1) }

    if (this.x === rect.x && this.y === rect.y && this.w === rect.w && this.h === rect.h) {
      return // Don't update when unchanged
    }

    this.x = rect.x
    this.y = rect.y
    this.w = rect.w
    this.h = rect.h
    this.calculateBounds()
    client.toggleGuide(false)

    client.update()
  }

  this.selectAll = () => {
    this.select(0, 0, client.orca.w, client.orca.h)
    this.ins = false
	  this.announceInsert()
  }

  this.move = (x, y) => {
    this.select(this.x + parseInt(x), this.y - parseInt(y))
  }

  this.moveTo = (x, y) => {
    this.select(x, y)
  }

  this.scale = (w, h) => {
    this.select(this.x, this.y, this.w + parseInt(w), this.h - parseInt(h))
  }

  this.scaleTo = (w, h) => {
    this.select(this.x, this.y, w, h)
  }

  this.drag = (x, y) => {
    if (isNaN(x) || isNaN(y)) { return }
    this.ins = false
    const block = this.selection()
    this.erase()
    this.move(x, y)
    client.orca.writeBlock(this.minX, this.minY, block)
    client.history.record(client.orca.s)
  }

  this.reset = (pos = false) => {
    this.select(pos ? 0 : this.x, pos ? 0 : this.y, 0, 0)
    this.ins = 0
  }

  this.read = () => {
    return client.orca.glyphAt(this.x, this.y)
  }

  this.readTextAt = (x, y) => {
    return '' + client.orca.glyphAt(x, y)
  }

  this.write = (g) => {
    if (!client.orca.isAllowed(g)) { return }
client.accessibility.makeAnnouncement(g)
    if (client.orca.write(this.x, this.y, g) && this.ins) {
      this.move(1, 0)
    }
    client.history.record(client.orca.s)
  }

  this.erase = () => {
    for (let y = this.minY; y <= this.maxY; y++) {
      for (let x = this.minX; x <= this.maxX; x++) {
        client.orca.write(x, y, '.')
      }
    }
    client.history.record(client.orca.s)
  }

  this.find = (str) => {
    const i = client.orca.s.indexOf(str)
    if (i < 0) { return }
    const pos = client.orca.posAt(i)
    this.select(pos.x, pos.y, str.length - 1, 0)
  }

  this.inspect = () => {
    if (this.w !== 0 || this.h !== 0) { return 'multi' }
    const index = client.orca.indexAt(this.x, this.y)
    const port = client.ports[index]
    if (port) { return `${port[3]}` }
    if (client.orca.lockAt(this.x, this.y)) { return 'locked' }
    return 'empty'
  }

  this.announcement = () => {
	  	  var value = this.readTextAt(this.x,this.y)
	  
    if (this.w !== 0 || this.h !== 0) {
		var x = this.x+this.w
		var y = this.y+this.h
		value = this.readTextAt(x,y)
		
		 return `${this.w} Width ${this.h} Height ${this.announcementAt(value, x, y)}` 
	}

     return this.announcementAt(value, this.x, this.y)
  }

  this.getValue= (value, x, y) => {
  	  value = value === '.' ? 'empty' : value
  	  	  value = value === '*' ? 'bang' : value

var what = 'None'
	  
    const index = client.orca.indexAt(x, y)
    const port = client.ports[index]
	  
    if (port) {what = ` ${port[3]}`}
    else if (client.orca.lockAt(x, y)) {what = 'Locked'}
	  return{value: `${value}`, what: `${what}`}
  }
  
  this.announcementAt = (value, x, y, includeXY=true, includeState=true) => {
	  value = value === '.' ? 'empty' : value
	  	  value = value === '*' ? 'bang' : value
	  
	  var returnValue = ''
	  
	  if(includeXY) {
	  	returnValue += `${x},${y} `
	  }
	  
    const index = client.orca.indexAt(x, y)
    const port = client.ports[index]
	  
	  if ( includeState ) {
    if (port) {returnValue += ` ${port[3]} `}
    else if (client.orca.lockAt(x, y)) {returnValue += 'Locked'}
}

returnValue += `${value}`

    return returnValue
  }

  this.addPadding = () => {
	  var returnValue = this.selection()
	  
	  var max = Math.random()*20
	  
	  for(let i=0; i<max; i++ ) {
	  returnValue += '.'  
	  }
  
  return returnValue
}

  this.equalsCoords = (x,y) => {
	  return (this.x === x && this.y === y)
  }
  
  this.announceInsert = () => {
	  var insStatus = this.ins ? 'Insert On' : 'Insert Off'
	  client.accessibility.makeAnnouncement(insStatus)
  }
  
  this.trigger = () => {
    const operator = client.orca.operatorAt(this.x, this.y)
    if (!operator) { console.warn('Cursor', 'Nothing to trigger.'); return }
    console.log('Cursor', 'Trigger: ' + operator.name)
    operator.run(true)
  }

  this.comment = () => {
    const block = this.selection()
    const lines = block.trim().split(/\r?\n/)
    const char = block.substr(0, 1) === '#' ? '.' : '#'
    const res = lines.map((line) => { return `${char}${line.substr(1, line.length - 2)}${char}` }).join('\n')
    client.orca.writeBlock(this.minX, this.minY, res)
    client.history.record(client.orca.s)
  }

  this.toUpperCase = () => {
    const block = this.selection().toUpperCase()
    client.orca.writeBlock(this.minX, this.minY, block)
  }

  this.toLowerCase = () => {
    const block = this.selection().toLowerCase()
    client.orca.writeBlock(this.minX, this.minY, block)
  }

  this.toRect = () => {
    return {
      x: this.minX,
      y: this.minY,
      w: this.maxX - this.minX + 1,
      h: this.maxY - this.minY + 1
    }
  }

  this.calculateBounds = () => {
    this.minX = this.x < this.x + this.w ? this.x : this.x + this.w
    this.minY = this.y < this.y + this.h ? this.y : this.y + this.h
    this.maxX = this.x > this.x + this.w ? this.x : this.x + this.w
    this.maxY = this.y > this.y + this.h ? this.y : this.y + this.h
  }

  this.selected = (x, y, w = 0, h = 0) => {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY
  }

  this.selection = (rect = this.toRect()) => {
    return client.orca.getBlock(rect.x, rect.y, rect.w, rect.h)
  }

  this.mouseFrom = null

  this.onMouseDown = (e) => {
    if (e.button !== 0) { this.cut(); return }
    const pos = this.mousePick(e.clientX, e.clientY)
    this.select(pos.x, pos.y, 0, 0)
    this.mouseFrom = pos
  }

  this.onMouseMove = (e) => {
    if (!this.mouseFrom) { return }
    const pos = this.mousePick(e.clientX, e.clientY)
    this.select(this.mouseFrom.x, this.mouseFrom.y, pos.x - this.mouseFrom.x, pos.y - this.mouseFrom.y)
  }

  this.onMouseUp = (e) => {
    if (this.mouseFrom) {
      const pos = this.mousePick(e.clientX, e.clientY)
      this.select(this.mouseFrom.x, this.mouseFrom.y, pos.x - this.mouseFrom.x, pos.y - this.mouseFrom.y)
    }
    this.mouseFrom = null
  }

  this.mousePick = (x, y, w = client.tile.w, h = client.tile.h) => {
    return { x: parseInt((x - 30) / w), y: parseInt((y - 30) / h) }
  }

  this.onContextMenu = (e) => {
    e.preventDefault()
  }

  this.copy = function () {
    document.execCommand('copy')
  }

  this.cut = function () {
    document.execCommand('cut')
  }

  this.paste = function (overlap = false) {
    document.execCommand('paste')
  }

  this.onCopy = (e) => {
    e.clipboardData.setData('text/plain', this.selection())
    e.preventDefault()
  }

  this.onCut = (e) => {
    this.onCopy(e)
    this.erase()
  }

  this.onPaste = (e) => {
    const data = e.clipboardData.getData('text/plain').trim()
    client.orca.writeBlock(this.minX, this.minY, data, this.ins)
    client.history.record(client.orca.s)
    this.scaleTo(data.split(/\r?\n/)[0].length - 1,  data.split(/\r?\n/).length - 1)
    e.preventDefault()
  }

  this.getPrevOrca = () => {

	  var prevOrca = []

      for (let y = this.minY; y <= this.maxY; y++) {
        for (let x = this.minX; x <= this.maxX; x++) {
			prevOrca.push(this.readTextAt(x,y))
		}
	}
			
	return {bpm: client.clock.speed.value, block: prevOrca}
  }

  this.gotoNextItem = (allowBang=true) => {

var found = false
	  var curX = this.x
	  var curY = this.y
	  
	  for( let y=curY; y < client.orca.h; y++ ) {
		  if(found) {break}
      for (let x = (y===curY) ? curX : 0; x < client.orca.w; x++) {
		  if(found) {break}
			var item = client.orca.glyphAt(x,y)
		 
		  if ( item === '*') {
			  if ( allowBang ) {
		  				this.moveTo(x,y)
		  			 	found = true
			  }
		  			}
			else if(  item !== '.') { 				
				this.moveTo(x,y)
			 	found = true
			} 	
		}
		}
			
			
		if ( !found ) {
			client.accessibility.makeAnnouncement('No Items Found') 
			
		}
  }
  
  this.gotoPreviousItem = (allowBang=true) => {

var found=false
	  var curX = this.x
	  var curY = this.y
	  
	  for( let y=curY; y >= 0; y-- ) {
	  if(found) {break} 
      for (let x = (y===curY) ? curX : client.orca.w-1; x >= 0; x--) {
		  if(found) {break}
			var item = client.orca.glyphAt(x,y)
		  
		  if ( item === '*') {
			  if ( allowBang ) {
		  				this.moveTo(x,y)
		  			 	found = true
			  }
		  			}
			else if(  item !== '.') { 				
				this.moveTo(x,y)
			 	found = true
			} 
	
		}
		}
			
			
		if ( !found ) {
			client.accessibility.makeAnnouncement('No Items Found') 
			
		}
  }

  this.trackChanges = (prevOrca, frame) => {
	  var newOrca = this.getPrevOrca()
	  var changeCount = 0
	  var header = ['Change #', 'X,Y', 'What', 'Change']
	  if ( client.clock.oldSpeedValue !== client.clock.speed.value) {
		  				  changeCount++
		  			  		client.orca.createOrUpdateTable('changeTbody', 'changes', 'Changes', header, 'changeTbodyRow-' + frame + changeCount, [`${frame} #${changeCount}`, `N/A`, 'BPM', `${client.clock.oldSpeedValue} to ${client.clock.speed.value}`])
		  client.clock.oldSpeedValue = client.clock.speed.value
	  }
	 
      for (let y = this.minY; y <= this.maxY; y++) {
        for (let x = this.minX; x <= this.maxX; x++) {
var prevOrcaValue = this.getValue(prevOrca.block.shift(), x, y)
			var newOrcaValue = this.getValue(newOrca.block.shift(), x, y)
			
		  if ( prevOrcaValue.value !== newOrcaValue.value) {
			  				  changeCount++
			  		client.orca.createOrUpdateTable('changeTbody', 'changes', 'Changes', header, 'changeTbodyRow-' + frame + changeCount, [`${frame} #${changeCount}`, `${x},${y}`, `${newOrcaValue.what}`, `${prevOrcaValue.value} to ${newOrcaValue.value}`])
		  }
      }
  }
    
	client.accessibility.makeAnnouncement(`Frame ${frame} Changes ${changeCount} BPM ${newOrca.bpm}`)	
  }

  this.changeDetailLevel = () => {
	  if ( this.detailLevel === 2) {
	  	this.detailLevel = 0
	  } else {
	  	this.detailLevel++
	  }
	  
	  client.accessibility.makeAnnouncement('Detail Level ' + this.detailLevel)
  }

  function clamp (v, min, max) { return v < min ? min : v > max ? max : v }
}
