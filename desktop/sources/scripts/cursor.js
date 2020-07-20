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
	this.detailLevel = 2

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

  this.write = (g) => {
    if (!client.orca.isAllowed(g)) { return }
 this.announcement(2, g)
    if (client.orca.write(this.x, this.y, g) && this.ins) {
		this.announcement(0, g)
      this.move(1, 0)
    }
    client.history.record(client.orca.s)
  }

  this.erase = () => {
	  if( this.ins && !this.hasSelection()) {
	  this.announcement(0, this.selection())	  	
	  } else {
	  this.announcement(this.detailLevel, this.selection())
	  }
	  
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

  this.hasSelection = () => {
	      return this.w !== 0 || this.h !== 0
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
  
  this.announcement = (detailLevel=this.detailLevel, value=this.selection(), x=this.x, y=this.y) => {
	  value = value.length === 2 && value.includes('.') ? 'empty' : value
	  	  value = value.length === 2 && value.includes('*') ? 'bang' : value
	  	  	  value = this.hasSelection() ? `select ${value}` : value
	  
	  var returnValue = ''
	  
	  if(detailLevel > 0) {
		  const hasRan = client.orca.hasRanAt(this.x,this.y) ? 'Ran' : ''
	  	returnValue += `${hasRan} ${x},${y} `
	  }
	  
    const index = client.orca.indexAt(x, y)
    const port = client.ports[index]
	  
	  if ( detailLevel > 1 ) {
		  var what=''
		  
    if (port) {what= ` ${port[3]} `}
    else if (client.orca.lockAt(x, y)) {what= ' Locked '}
	
	// short hand for selects at detail level 2, good for counting
	if ( this.hasSelection()) {
		value =` ${client.orca.glyphAt(x,y)} `
		returnValue = `${this.w} Width ${this.h} Height ${x},${y} ${what}`
	} else {
		returnValue += what
	}
}

returnValue += `${value}`

if(detailLevel === 0) {
	returnValue += client.accessibility.randomPads()
}

 client.accessibility.makeAnnouncement(returnValue )
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

  this.goto = (args) => {
	  if(args.length === 2) {
		  const x = parseInt(args[0])
		  const y = parseInt(args[1])

		  				this.moveTo(x,y)
				  this.announcement(2)	  	
	  }
  }

  this.gotoNextRanItem = () => {
var found = false
	  var curX = this.x
	  var curY = this.y
	  const operators = client.orca.getRanOperators()

	  for( let y=curY; y < client.orca.h; y++ ) {
		  if(found) {break}
      for (let x = (y===curY) ? curX : 0; x < client.orca.w; x++) {
		  if(found) {break}
		  
		  for ( const operator of operators ) { // operator
			  		  if(found) {break}
		  	
					  if ( this.hasSelection()) { // selection
						  if ( this.selected(x,y)) { // selected
							  						  if ( operator.x === x && operator.y === y && operator.hasRan) { // found
		  				this.moveTo(x,y)
				  this.announcement(2)
		  			 	found = true						  	
													  } //found
						  } // selected
					  } // selection
					  else { // not selected
						  if ( operator.x === x && operator.y === y && operator.hasRan) { // found
		  				this.moveTo(x,y)
				  this.announcement(2)
		  			 	found = true
						  } // found
					  } // not selected
		  } // operator

		}
		}
			
		if ( !found ) {
			this.announcement(0, 'No Ran Items Found' + this.hasSelection() ? ' in selection' : '' ) 
			
		}
  }

  this.gotoPreviousRanItem = () => {
var found=false
	  var curX = this.x
	  var curY = this.y
	  const operators = client.orca.getRanOperators()
	  
	  for( let y=curY; y >= 0; y-- ) {
	  if(found) {break} 
      for (let x = (y===curY) ? curX : client.orca.w-1; x >= 0; x--) {
		  if(found) {break}
		  for ( const operator of operators ) { // operator
			  		  if(found) {break}
		  	
					  if ( this.hasSelection()) { // selection
						  if ( this.selected(x,y)) { // selected
							  						  if ( operator.x === x && operator.y === y && operator.hasRan) { // found
		  				this.moveTo(x,y)
				  this.announcement(2)
		  			 	found = true						  	
													  } //found
						  } // selected
					  } // selection
					  else { // not selected
						  if ( operator.x === x && operator.y === y && operator.hasRan) { // found
		  				this.moveTo(x,y)
				  this.announcement(2)
		  			 	found = true
						  } // found
					  } // not selected
		  } // operator
		}
		}
			
		if ( !found ) {
			this.announcement(0, 'No Ran Items Found' + (this.hasSelection() ? ' in selection' : '') ) 
			
		}
  }
  
  this.gotoNextItem = (str='') => {
var found = false
	  var curX = this.x
	  var curY = this.y

	  for( let y=curY; y < client.orca.h; y++ ) {
		  if(found) {break}
      for (let x = (y===curY) ? curX : 0; x < client.orca.w - str.length; x++) {
		  if(found) {break}
			var item = client.orca.glyphAt(x,y)

		 var chunk = ''
		  for (let i=x; i<x+str.length; i++) {
		  	chunk += client.orca.glyphAt(i,y)
		  }
		  
		  if ( str.length > 0 && str === chunk) {
		  				this.moveTo(x,y)
				  this.announcement(2)
		  			 	found = true
		  			}
			else if( str.length === 0 && item !== '.') { 				
				this.moveTo(x,y)
								  this.announcement(2)
			 	found = true
			} 	
		}
		}
			
			
		if ( !found ) {
			this.announcement(0, 'No Items Found') 
			
		}
  }
  
  this.gotoPreviousItem = (str='') => {
var found=false
	  var curX = this.x
	  var curY = this.y
	  
	  for( let y=curY; y >= 0; y-- ) {
	  if(found) {break} 
      for (let x = (y===curY) ? curX : client.orca.w-1; x >= str.length; x--) {
		  if(found) {break}
			var item = client.orca.glyphAt(x,y)
		  
		 var chunk = ''
		  for (let i=x; i>x-str.length; i--) {
		  	chunk = client.orca.glyphAt(i,y) + chunk
		  }
		  
		  if ( str.length > 0 && str === chunk) {
		  				this.moveTo(x-str.length+1,y)
				  				  this.announcement(2)
		  			 	found = true
		  			}
			else if( str.length === 0 && item !== '.') { 				
				this.moveTo(x,y)
								  this.announcement(2)
			 	found = true
			} 
	
		}
		}
			
		if ( !found ) {
			this.announcement(0, 'No Items Found') 
			
		}
  }

  this.trackChanges = (frame) => {
	  var changeCount = 0
	  const header = ['Change #', 'X,Y', 'Name', 'Output', 'From']
	  const newSpeedValue = client.clock.speed.value
	  
	  if ( client.clock.frameOffset === 0) {
		  client.clock.oldSpeedvalue = newSpeedValue
		  client.clock.frameOffset++
	  } else {
	  	client.clock.frameOffset++
	  }
	  
    for (const operator of client.orca.getRanOperators()) {
		if ( this.hasSelection() ) { // selection
		if ( this.selected(operator.x, operator.y)) { // selected
			changeCount++
			this.addRanOperator(frame, changeCount, header, operator)
		} // selected
	} // selection
		 else {
			changeCount++
			this.addRanOperator(frame, changeCount, header, operator)
		}
  }
    
  const bpmChange = client.clock.oldSpeedValue !== newSpeedValue
  var bpmChangeText = ''
  
  if ( bpmChange) {
	  				  changeCount++
	  bpmChangeText = `${client.clock.oldSpeedValue} to ${newSpeedValue}`
	  			  		client.orca.createOrUpdateTable('changeTbody', 'changes', 'Changes', header, 'changeTbodyRow-' + frame + changeCount, [`${frame} #${changeCount}`, `N/A`, 'BPM', `${bpmChangeText}`, 'none'])
	  bpmChangeText = 'BPM ' + bpmChangeText
	  client.clock.oldSpeedValue = newSpeedValue
  }

	
	client.accessibility.makeAnnouncement(`Frame ${frame} Changes ${changeCount} ${bpmChangeText}`)	
  }

  this.addRanOperator = (frame, changeCount, header, operator) => {
			  		client.orca.createOrUpdateTable('changeTbody', 'changes', 'Changes', header, 'changeTbodyRow-' + frame + changeCount, [`${frame} #${changeCount}`, `${operator.x},${operator.y}`, !operator.name || operator.name === 'null' ? '*' : `${operator.name} (${operator.glyph})`, `${operator.outputValue}`, `${operator.from}`])  	
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
