function saveOptions() {
    var interval = getElementValue("interval");
    var sound = getElementValue("sound");
    var messageCount = getElementValue("message-count");
    var displayTime = getElementValue("display-time");
    var notificationClick = getElementValue("notification-click");
    var selectedCategories = $("#categories").val();

    chrome.storage.sync.set({
        "sound": sound,
        "interval": interval,
        "messageCount": messageCount,
        "displayTime": displayTime,
        "notificationClick": notificationClick,
        "selectedCategories": selectedCategories
    }, function() {
        var submit = document.getElementById('save');
        var oldText = submit.innerHTML;
        submit.innerHTML = 'OK...';

        setTimeout(function() {
            submit.innerHTML = oldText;
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
        "displayTime": 10,
        "notificationClick": "open",
        "selectedCategories": []
    }, function(items) {
        $('#interval').val(items['interval']);
        $('#sound').val(items['sound']);
        $('#message-count').val(items['messageCount']);
        $('#display-time').val(items['displayTime']);
        $('#notification-click').val(items['notificationClick']);
        $('#categories').val(items['selectedCategories']);

        $('select').material_select();
    });

}

$(document).ready(function() {
    restoreOptions();
    $('#save').bind('click', saveOptions);
});

