'use strict'

function Accessibility(client) {
	this.announcement = document.querySelector('#announcement');
	console.log('accessibility=' + this.announcement)

this.clearAnnouncement = function () {
	this.announcement.textContent = "";
}

this.makeAnnouncement = function (text) {
	this.clearAnnouncement();
	this.announcement.textContent = text;
}
}