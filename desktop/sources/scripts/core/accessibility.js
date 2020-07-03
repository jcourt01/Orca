'use strict'

function Accessibility(client) {
	this.announcement = document.querySelector('#announcement')
	this.announcementText = ""

	this.clearAnnouncement = function () {
		this.announcement.textContent = "";
	}

	this.makeAnnouncement = function (text) {
		this.announcement.setAttribute("aria-hidden", "false")
		this.clearAnnouncement();
		this.announcement.textContent = text;
	}
}