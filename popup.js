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

                var thumbnail = '';
                var title = '<span class="card-title"><img class="logo" src="images/mpm.svg" />' + wal[id]['category']['name'] + ' | ' + wal[id]['timePretty'] + '</span>';
                if (typeof wal[id]['thumbnail'] != 'undefined' && wal[id]['thumbnail'] != null) {
                    thumbnail = '' +
                        '<div class="card-image">' +
                        '<img src="' + wal[id]['thumbnail'] + '">' +
                        title +
                        '</div>';
                    title = '';
                }

                var article = document.createElement('div');
                article.innerHTML = '' +
                    '<div class="card">' +
                    thumbnail +
                    '<div class="card-content">' +
                    title +
                    wal[id]['excerpt'] +
                    '</div>' +
                    '</div>';
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

Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
};

function initLastSyncTime() {
    var syncTimeValue = $('#sync-time-value');

    chrome.storage.sync.get("syncTime", function(val) {
        if (typeof val['syncTime'] == 'undefined') {
            val['syncTime'] = Date.now();
        }

        syncTimeValue.text((new Date(val['syncTime'])).timeNow());
    });
}

$(document).ready(function() {
    $('select').material_select();

    initSnoozeTimer();
    initLatestMessages();
    initLastSyncTime();

    $("#set-snooze").bind("click", setSnoozeTimer);
    $("#unbind-snooze").bind("click", removeSnoozeTimer);
});