function saveOptions() {
    var interval = getElementValue("interval");
    var sound = getElementValue("sound");
    var messageCount = getElementValue("message-count");
    var importantOnly = document.getElementById("important-only").checked;
    var displayTime = getElementValue("display-time");
    var notificationClick = getElementValue("notification-click");

    chrome.storage.sync.set({
        "sound": sound,
        "interval": interval,
        "messageCount": messageCount,
        "importantOnly": importantOnly,
        "displayTime": displayTime,
        "notificationClick": notificationClick
    }, function() {
        var submit = document.getElementById('save');
        submit.classList.add('i-check');

        setTimeout(function() {
            submit.classList.remove('i-check');
        }, 1200);
    });
}

function getElementValue(elementId) {
    var element = document.getElementById(elementId);
    var value = parseInt(element.value);

    if (element.getAttribute("min") != null && value < element.getAttribute("min")) {
        element.value = element.getAttribute("min");
    } else if (element.getAttribute("max") != null && value > element.getAttribute("max")) {
        element.value = element.getAttribute("max");
    }

    return element.value;
}

function restoreOptions() {
    chrome.storage.sync.get({
        "sound": "no-sound",
        "interval": 5,
        "messageCount": 3,
        "importantOnly": false,
        "displayTime": 10,
        "notificationClick": "open"
    }, function(items) {
        document.getElementById('interval').value = items['interval'];
        document.getElementById('sound').value = items['sound'];
        document.getElementById('message-count').value = items['messageCount'];
        document.getElementById('important-only').checked = items['importantOnly'];
        document.getElementById('display-time').value = items['displayTime'];
        document.getElementById('notification-click').value = items['notificationClick'];
    });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
