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

            document.getElementById("no-topics-available").style.display = "none";

            var a = document.createElement('a');
            a.textContent = val['topics'][key];
            a.classList.add('d-tag');
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
    var topics = document.getElementsByClassName("d-tag");

    for (var i=0; i < topics.length; i++) {
        topics[i].style.display = 'none';
    }

    srcElement.blur();
    srcElement.style.display = 'inline-block';

    document.getElementById("unbind-topic").style.display = 'inline-block';

    chrome.storage.local.get("stickyTopicMessage", function(val) {
        var message = document.getElementById('sticky-topic-message');

        if (typeof val['stickyTopicMessage'] !== 'undefined' && val['stickyTopicMessage'].length > 5) {
            message.innerHTML = val['stickyTopicMessage'];
            message.style.display = "block";
        } else {
            message.style.display = "none";
        }
    });
}

function removeTopicFilter() {
    document.getElementById("unbind-topic").style.display = 'none';
    document.getElementById("sticky-topic-message").style.display = 'none';

    var topics = document.getElementsByClassName("d-tag");
    for (var i=0; i < topics.length; i++) {
        topics[i].style.display = 'inline-block';
    }

    chrome.storage.local.remove("selectedTopic");
    chrome.storage.local.remove("stickyTopicMessage");
}

function initLatestMessages() {
    chrome.storage.local.get("latestMessageIds", function(val) {
        var query = {};
        for (var i in val['latestMessageIds']) {
            if (val['latestMessageIds'].hasOwnProperty(i)) {
                query[val['latestMessageIds'][i]] = null;
            }
        }

        chrome.storage.local.get(query, function(wal) {
            var latestMessages = document.getElementById("latest-messages");
            var ids = Object.keys(query).sort().reverse();

            for (i=0; i<ids.length; i++){
                var id = ids[i];
                if (id == "undefined") {
                    continue;
                }

                var article = document.createElement('article');
                var title = '<h3 class="title"><a href="' + wal[id]['targetUrl'] + "?ref=ext" + '"><time class="d-posted">' + wal[id]['timePretty'] + '</time></a></h3>';

                var topics = "";
                for (var tag in wal[id]['topics']) {
                    if (wal[id]['topics'].hasOwnProperty(tag)) {
                        topics += '<a href="https://dennikn.sk/tema/' + tag + '/?ref=mpm" class="d-tag">' + wal[id]['topics'][tag] + '</a>';
                    }
                }
                topics = '<nav class="e_tags">'+topics+'</nav>';

                article.innerHTML = title + ' ' + wal[id]['excerpt'] + topics;
                article.classList.add('a_minute');
                article.id = "mpm-" + id;

                latestMessages.appendChild(article);
            }

            var anchors = latestMessages.getElementsByTagName('a');
            for (i=0; i<anchors.length; i++){
                anchors[i].setAttribute('target', '_blank');
            }
        });
    });
}

window.addEventListener("load", function() {
    initTopicSelector();
    initSnoozeTimer();
    initLatestMessages();

    document.getElementById("set-snooze").addEventListener("click", setSnoozeTimer);
    document.getElementById("unbind-snooze").addEventListener("click", removeSnoozeTimer);
    document.getElementById("unbind-topic").addEventListener("click", removeTopicFilter);
});

