var notID = 0;
var logo = "/images/icon-hires.png";
var buttons = [
	"Zobraziť celú správu..."
];

var articleParserRegex = /(\<article[\s\S]*?\<\/article\>)/ig;

var targetUrlRegex = /https?:\/\/dennikn.sk\/minuta\/(\d+)/;
var timeRegex = /(\d{4})-0?(\d+)-0?(\d+)[T ]0?(\d+):0?(\d+):0?(\d+)/;
var messageRegex = /\<p\>(.*?)\<\/p\>/gi;
var htmlRegex = /(<([^>]+)>)/ig;
var imageRegex = /\<figure\>.*\<img.*?src=\"(.*?)\".*\<\/figure\>/;
var articleIdRegex = /article id=\"mpm-(\d+)\"/;
var youtubeRegex = /youtube\.com\/embed\/(.*?)[\/\?]/;

var defaultOptions = {
	type : "basic",
	title: "Minúta po minúte",
	message: null,
};

var lastProcessedId = getLastProcessedArticleId();

chrome.notifications.onClosed.addListener(notificationClosed);
chrome.notifications.onClicked.addListener(notificationClicked);
chrome.notifications.onButtonClicked.addListener(notificationBtnClick);

setInterval(function() {
	xhrDownload("text", "https://dennikn.sk/wp-admin/admin-ajax.php?action=minute&home=0&tag=0", function() {
		var matches = this.response.match(articleParserRegex);
		for (i in matches) {
			notifyArticle(matches[i].replace(/\s+/g," "));
		}
	});
}, 60000);

function notifyArticle(body) {
	var thumbnail = extractFigure(body);
	var time = extractTimePretty(body);
	var message = extractMessage(body);
	var id = extractId(body);
	var targetUrl = extractTargetUrl(body);

	var options = JSON.parse(JSON.stringify(defaultOptions));
	var meta = {
		"targetUrl": targetUrl
	}

	if (id === null || message === null) {
		console.warn("Could not parse the message from the source, skipping...");
		return;
	}

	options.message = message;

	if (time !== null) {
		options.title = "[" + time + "] " + options.title;
	}

	if (thumbnail !== null) {
		xhrDownload("blob", thumbnail, function() {
		    var blob = this.response;
		    options.type = "image";
		    options.imageUrl = window.URL.createObjectURL(blob);

		    doNotify(id, options, meta);
		});
	} else {
		doNotify(id, options, meta);
	}
}

function xhrDownload(responseType, thumbnail, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", thumbnail);
	xhr.responseType = responseType;

	xhr.onload = callback;
	xhr.send(null);	
}

function doNotify(id, options, meta) {
	options.iconUrl = chrome.runtime.getURL(logo);

	options.buttons = [];
	for (var i in buttons) {
		options.buttons.push({ title: buttons[i] });
	}

	var storage = {};
	storage[id] = meta;
	chrome.storage.local.set(storage);

	chrome.notifications.create(id, options, creationCallback);
}

function creationCallback(notID) {
	
}

function notificationClosed(notID, bByUser) {
	console.log("The notification '" + notID + "' was closed" + (bByUser ? " by the user" : ""));
}

function notificationClicked(notID) {
	console.log("The notification '" + notID + "' was clicked");
}

function notificationBtnClick(notID, iBtn) {
	chrome.storage.local.get(notID, function(val) {
		var targetUrl = val[notID].targetUrl;
		// buggy, causing chrome to crash sites
		chrome.tabs.create({url: targetUrl});
	});
}

function extractFigure(body) {
	var matches = body.match(imageRegex);
	if (matches !== null && matches.length == 2) {
		return matches[1];
	} 

	matches = body.match(youtubeRegex);
	if (matches !== null && matches.length == 2) {
		return "http://img.youtube.com/vi/" + matches[1] + "/mqdefault.jpg";;
	}
	
	return null;
}

function extractTimePretty(body) {
	var matches = body.match(timeRegex);
	if (matches !== null && matches.length == 7) {
		//NOTE: Switch to this implementation if N starts using proper timezone
		// var date = new Date(matches[0]);
		// return date.getHours() + ":" + date.getMinutes();

		return ("0" + matches[4]).slice(-2) + ":" + ("0" + matches[5]).slice(-2);
	} 

	return null;
}

function extractMessage(body) {
	var matches = body.match(messageRegex);
	if (matches !== null && matches.length > 0) {
		return matches[0].replace(htmlRegex, "");
	} 

	return null;
}

function extractId(body) {
	var matches = body.match(articleIdRegex);
	if (matches !== null) {
		return matches[1];
	} 

	return null;
}

function extractTargetUrl(body) {
	var matches = body.match(targetUrlRegex);
	if (matches !== null && matches.length == 2) {
		return matches[0];
	} 

	return null;
}

function getLastProcessedArticleId() {
	
}