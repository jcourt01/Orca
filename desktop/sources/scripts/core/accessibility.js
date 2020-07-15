'use strict'

function Accessibility(client) {
	this.announcement = document.querySelector('#announcement')
	this.announcementText = ""
	this.maxRandomPads = 9
	this.pad = '.'

	this.clearAnnouncement = function () {
		this.announcement.textContent = "";
	}

	this.makeAnnouncement = function (text) {
		this.announcement.setAttribute("aria-hidden", "false")
		this.clearAnnouncement();
		this.announcement.textContent = text;
	}
	
		this.randomPads = function (){
			var returnValue = ''
			
			for ( let i=0; i<Math.random()*this.maxRandomPads; i++) {
				returnValue += this.pad
			}
			
			return returnValue
		}
}