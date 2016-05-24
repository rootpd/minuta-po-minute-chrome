function initSnoozeTimer() {
    var timer = document.getElementById("snooze-timer");
    var timerValue = document.getElementById("snooze-timer-value");

    chrome.storage.sync.get("snooze", function(val) {
        if (typeof val['snooze'] == 'undefined' || val['snooze'] == 'off' || val['snooze'] <= (new Date()).getTime()) {
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

function setSettings() {
    var snoozeVal = parseInt($("#snooze").val());
    var categoriesVal = $('#categories').val();

    var snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + snoozeVal);

    var options = {};
    options['snooze'] = snoozeDate.getTime();
    options['selectedCategories'] = categoriesVal;

    chrome.storage.sync.set(options, function(val) {
        initSnoozeTimer();
        initCategoryFilter();
    });

    var submit = $('#set-settings');
    var oldText = submit.text();
    submit.text('OK...');
    setTimeout(function() {
        submit.text(oldText);
    }, 1200);
}

function initLatestMessages(categories) {
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

                var categoryTitles = [];
                var categoryMatch = false;

                for (j=0; j<wal[id]['categories'].length; j++) {
                    if (wal[id]['categories'][j]['slug'] == 'hlavna') {
                        continue
                    }
                    if (categories.indexOf(wal[id]['categories'][j]['slug']) !== -1) {
                        categoryMatch = true;
                    }
                    categoryTitles.push(wal[id]['categories'][j]['name']);
                }

                console.log(categories)
                if (!categoryMatch && categories.length > 0) {
                    continue;
                }

                var thumbnail = '';
                var title = '<a href="' + wal[id]['targetUrl'] + '"><span class="badge grey-text text-lighten-1">' + wal[id]['timePretty'] + '</span></a>' +
                    '<span class="card-title"><img class="logo" src="images/mpm.svg" />' + categoryTitles.join(" | ") + '</span>';
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

function initCategoryFilter(callback) {
    var list = {
        "svet": "Svet",
        "slovensko": "Slovensko",
        "ekonomika": "Ekonomika",
        "kultura": "Kultúra",
        "sport": "Šport"
    };

    var categoriesSelect = $('#categories');
    var categoriesFilterValue = $('#categories-filter-value');

    chrome.storage.sync.get("selectedCategories", function(val) {
        names = [];

        if (val['selectedCategories'] == null) {
            val['selectedCategories'] = [];
        }

        for (i=0; i<val['selectedCategories'].length; i++) {
            names.push(list[val['selectedCategories'][i]]);
        }
        categoriesSelect.val(val['selectedCategories']);
        if (names.length > 0) {
            categoriesFilterValue.text(names.join(", "));
        }

        $('select').material_select();

        if (typeof(callback) == 'undefined') {
            return;
        }

        callback(val['selectedCategories']);
    });
}

$(document).ready(function() {
    initSnoozeTimer();
    initLastSyncTime();

    initCategoryFilter(initLatestMessages);

    $('select').material_select();

    $("#set-settings").bind("click", setSettings);
});