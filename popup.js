function initSnoozeTimer() {
    var timer = document.getElementById("snooze-timer");
    var timerValue = document.getElementById("snooze-timer-value");

    chrome.storage.sync.get("snooze", function(val) {
        if (typeof val['snooze'] == 'undefined' || val['snooze'] == 'off' || val['snooze'] <= (new Date()).getTime) {
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

window.addEventListener("load", function() {
    initSnoozeTimer();
    document.getElementById("set-snooze").addEventListener("click", setSnoozeTimer);
    document.getElementById("unbind-snooze").addEventListener("click", removeSnoozeTimer);
});

