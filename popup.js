function initSnoozeTimer() {
    var timer = document.getElementById("snooze-timer");
    var timerValue = document.getElementById("snooze-timer-value");

    chrome.storage.sync.get("snooze", function(val) {
        if (typeof val['snooze'] == 'undefined' || val['snooze'] == 'off' || val['snooze'] <= (new Date()).getTime()) {
            timer.style.display = 'none';
            return;
        }

        var snoozedUntil = new Date(val['snooze']);
        var date = new Date();

        var diff = snoozedUntil.getTime() - date.getTime();
        var displayDiff = Math.ceil(Math.abs(diff/1000/60));
        var unit;

        if (displayDiff > 59) {
            displayDiff = Math.ceil(displayDiff/60);
            switch (displayDiff) {
                case 1:
                    unit = "hodina";
                    break;
                case 2:
                case 3:
                case 4:
                    unit = "hodiny";
                    break;
                default:
                    unit = "hodín";
            }
        } else {
            switch (displayDiff) {
                case 1:
                    unit = "minúta";
                    break;
                case 2:
                case 3:
                case 4:
                    unit = "minúty";
                    break;
                default:
                    unit = "minút";
            }
        }

        timerValue.innerHTML = displayDiff + " " + unit;
        timer.style.display = 'block';
    });
}

function setSnoozeTimer() {
    var value = document.getElementById("snooze").value;

    var snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + parseInt(value));

    var snooze = {};
    snooze['snooze'] = snoozeDate.getTime();
    chrome.storage.sync.set(snooze, function(val) {
        initSnoozeTimer();
    });
}

function removeSnoozeTimer() {
    chrome.storage.sync.remove("snooze", function(val) {
        initSnoozeTimer();
    });
}

function initTopicSelector() {
    var topicSelector = document.getElementById("topic-selector");
    var topicSelectorLastChild = document.getElementById("unbind-topic");

    chrome.storage.local.get("topics", function(val) {
        for (var key in val['topics']) {
            if (!val['topics'].hasOwnProperty(key)) {
                continue;
            }

            var a = document.createElement('a');
            a.textContent = val['topics'][key];
            a.classList.add('minutapominuteodkaz');
            a.classList.add('minutapominutefilter');
            a.classList.add('minutatopic');
            a.addEventListener("click", setTopicFilter);
            a.href = "#tema=" + val['topics'][key];
            a.id = key;

            topicSelector.insertBefore(a, topicSelectorLastChild);
        }

        chrome.storage.local.get("selectedTopic", function(wal) {
            if (typeof wal['selectedTopic'] != 'undefined') {
                setTopicFilterCallback(wal['selectedTopic']);
            }
        });
    });
}

function setTopicFilter(evt) {
    chrome.storage.local.set({"selectedTopic": evt.srcElement.id}, function() {
        setTopicFilterCallback(evt.srcElement.id);
    });
}

function setTopicFilterCallback(selectedElementId) {
    var srcElement = document.getElementById(selectedElementId);
    var topics = document.getElementsByClassName("minutatopic");

    for (var i=0; i < topics.length; i++) {
        topics[i].style.display = 'none';
    }

    srcElement.blur();
    srcElement.style.display = 'inline-block';

    document.getElementById("unbind-topic").style.display = 'inline-block';

    chrome.storage.local.get("stickyTopicMessage", function(val) {
        if (typeof val['stickyTopicMessage'] !== 'undefined' && val['stickyTopicMessage'].length > 5) {
            var message = document.getElementById('sticky-topic-message');
            message.innerHTML = val['stickyTopicMessage'];
        }
    });
}

function removeTopicFilter() {
    document.getElementById("unbind-topic").style.display = 'none';
    document.getElementById("sticky-topic-message").style.display = 'none';

    var topics = document.getElementsByClassName("minutatopic");
    for (var i=0; i < topics.length; i++) {
        topics[i].style.display = 'inline-block';
    }

    chrome.storage.local.remove("selectedTopic");
    chrome.storage.local.remove("stickyTopicMessage");
}

window.addEventListener("load", function() {
    initTopicSelector();
    initSnoozeTimer();
    document.getElementById("set-snooze").addEventListener("click", setSnoozeTimer);
    document.getElementById("unbind-snooze").addEventListener("click", removeSnoozeTimer);
    document.getElementById("unbind-topic").addEventListener("click", removeTopicFilter);
});

