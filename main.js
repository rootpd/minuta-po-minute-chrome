// Generated by CoffeeScript 1.10.0
(function() {
  var Minuta, MinutaAjaxDownloader, MinutaAjaxMessageParser, Notifier, intersection, notifier,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  MinutaAjaxDownloader = (function() {
    function MinutaAjaxDownloader() {
      this.getMessages = bind(this.getMessages, this);
    }

    MinutaAjaxDownloader.prototype.URI = "https://dennikn.sk/api/minuta";

    MinutaAjaxDownloader.prototype.ARTICLE_REGEX = /(<article[\s\S]*?<\/article>)/ig;

    MinutaAjaxDownloader.prototype.xhrDownload = function(responseType, URI, successCallback, errorCallback) {
      var xhr;
      xhr = new XMLHttpRequest();
      xhr.open("GET", URI);
      xhr.responseType = responseType;
      xhr.onload = successCallback;
      xhr.onerror = errorCallback;
      return xhr.send(null);
    };

    MinutaAjaxDownloader.prototype.getMessages = function(response) {
      return JSON.parse(response);
    };

    return MinutaAjaxDownloader;

  })();

  MinutaAjaxMessageParser = (function() {
    function MinutaAjaxMessageParser() {
      this.getCategories = bind(this.getCategories, this);
      this.getTopics = bind(this.getTopics, this);
      this.getPriority = bind(this.getPriority, this);
      this.getTargetUrl = bind(this.getTargetUrl, this);
      this.getId = bind(this.getId, this);
      this.getTimePretty = bind(this.getTimePretty, this);
      this.getFigure = bind(this.getFigure, this);
    }

    MinutaAjaxMessageParser.prototype.HTML_REGEX = /(<([^>]+)>)/ig;

    MinutaAjaxMessageParser.prototype.YOUTUBE_REGEX = /youtube\.com\/embed\/(.*?)[\/\?]/;

    MinutaAjaxMessageParser.prototype.PRIORITY_STICKY = "sticky";

    MinutaAjaxMessageParser.prototype.PRIORITY_IMPORTANT = "important";

    MinutaAjaxMessageParser.prototype.message = null;

    MinutaAjaxMessageParser.prototype.parse = function(message) {
      this.message = message;
      return {
        thumbnail: this.getFigure(),
        timePretty: this.getTimePretty(),
        text: this.getText(),
        html: this.getHtml(),
        excerpt: this.getHtmlExcerpt(),
        id: this.getId(),
        targetUrl: this.getTargetUrl(),
        priority: this.getPriority(),
        topics: this.getTopics(),
        categories: this.getCategories()
      };
    };

    MinutaAjaxMessageParser.prototype.getFigure = function() {
      var matches;
      if ((this.message['image'] != null) && (this.message['image']['large'] != null)) {
        return this.message['image']['large'];
      }
      if (this.message['embed'] != null) {
        matches = this.message['embed']['html'].match(this.YOUTUBE_REGEX);
        if ((matches != null) && matches.length === 2) {
          return "http://img.youtube.com/vi/" + matches[1] + "/mqdefault.jpg";
        }
      }
    };

    MinutaAjaxMessageParser.prototype.getTimePretty = function() {
      var date;
      date = new Date(this.message['created']);
      return date.timeNow();
    };

    MinutaAjaxMessageParser.prototype.getText = function() {
      var value;
      value = this.message['content']['main'].replace(this.HTML_REGEX, "");
      return this.decodeHtml(value);
    };

    MinutaAjaxMessageParser.prototype.getHtmlExcerpt = function() {
      return this.message['content']['main'];
    };

    MinutaAjaxMessageParser.prototype.getHtml = function() {
      var figure, html;
      if (this.message['content']['extended'] != null) {
        html = this.message['content']['extended'];
      } else {
        html = this.message['content']['main'];
      }
      figure = this.getFigure();
      if (figure != null) {
        html += "<p><img src='" + figure + "' /></p>";
      }
      return html;
    };

    MinutaAjaxMessageParser.prototype.getId = function() {
      return this.message['id'].toString();
    };

    MinutaAjaxMessageParser.prototype.getTargetUrl = function() {
      return this.message['url'];
    };

    MinutaAjaxMessageParser.prototype.getPriority = function() {
      if ((this.message['important'] != null) && this.message['important'] === true) {
        return this.PRIORITY_IMPORTANT;
      }
      if ((this.message['sticky'] != null) && this.message['sticky'] === true) {
        return this.PRIORITY_STICKY;
      }
    };

    MinutaAjaxMessageParser.prototype.getTopics = function() {
      var i, len, ref, tag, topics;
      topics = {};
      if (!this.message['tag']) {
        return topics;
      }
      ref = this.message['tag'];
      for (i = 0, len = ref.length; i < len; i++) {
        tag = ref[i];
        topics[tag['slug']] = tag['name'];
      }
      return topics;
    };

    MinutaAjaxMessageParser.prototype.getCategories = function() {
      return this.message['cat'];
    };

    MinutaAjaxMessageParser.prototype.decodeHtml = function(html) {
      var txt;
      txt = document.createElement("textarea");
      txt.innerHTML = html;
      return txt.value;
    };

    return MinutaAjaxMessageParser;

  })();

  Minuta = (function() {
    Minuta.prototype.thumbnail = null;

    Minuta.prototype.time = null;

    Minuta.prototype.message = null;

    Minuta.prototype.id = null;

    Minuta.prototype.targetUrl = null;

    Minuta.prototype.priority = null;

    Minuta.prototype.topics = null;

    function Minuta(thumbnail, time, message1, id1, targetUrl1, priority) {
      this.thumbnail = thumbnail;
      this.time = time;
      this.message = message1;
      this.id = id1;
      this.targetUrl = targetUrl1;
      this.priority = priority;
    }

    return Minuta;

  })();

  Notifier = (function() {
    Notifier.prototype.NO_TOPIC = "";

    Notifier.prototype.LOGO = "/images/icon512.png";

    Notifier.prototype.BUTTONS = [chrome.i18n.getMessage("readMoreButton")];

    Notifier.prototype.DEFAULT_SYNC_SETTINGS = {
      "sound": "no-sound",
      "interval": 5,
      "messageCount": 10,
      "displayTime": 10,
      "notificationClick": "open",
      "snooze": "off",
      "lastSync": Date.now(),
      "selectedCategories": []
    };

    Notifier.prototype.DEFAULT_LOCAL_SETTINGS = {
      "topics": {}
    };

    Notifier.prototype.DEFAULT_NOTIFICATION_OPTIONS = {
      type: "basic",
      title: chrome.i18n.getMessage("notificationTitle"),
      message: null,
      priority: 1
    };

    Notifier.prototype.notificationSound = null;

    Notifier.prototype.currentSettings = {};

    Notifier.prototype.downloader = null;

    Notifier.prototype.parser = null;

    Notifier.prototype.topics = {};

    function Notifier(downloader1, parser1) {
      this.downloader = downloader1;
      this.parser = parser1;
      this.openMessage = bind(this.openMessage, this);
      this.notificationBtnClick = bind(this.notificationBtnClick, this);
      this.notificationClicked = bind(this.notificationClicked, this);
      this.notificationClosed = bind(this.notificationClosed, this);
      this.creationCallback = bind(this.creationCallback, this);
      this.notifyArticle = bind(this.notifyArticle, this);
      this.reloadSettings = bind(this.reloadSettings, this);
      this.downloadMessages = bind(this.downloadMessages, this);
      this.run = bind(this.run, this);
      chrome.storage.local.clear();
      chrome.notifications.onClosed.addListener(this.notificationClosed);
      chrome.notifications.onClicked.addListener(this.notificationClicked);
      chrome.notifications.onButtonClicked.addListener(this.notificationBtnClick);
    }

    Notifier.prototype.run = function(forceSilent) {
      var downloader, parser;
      downloader = new this.downloader();
      parser = new this.parser();
      return this.reloadSettings((function(_this) {
        return function() {
          return _this.downloadMessages(downloader, parser, forceSilent);
        };
      })(this));
    };

    Notifier.prototype.downloadMessages = function(downloader, parser, silently) {
      var minutesInterval;
      if (!silently) {
        silently = this.currentSettings['snooze'] !== 'off' && this.currentSettings['snooze'] > Date.now();
      }
      minutesInterval = (this.currentSettings['interval'] != null) && parseInt(this.currentSettings['interval']) >= 1 ? parseInt(this.currentSettings['interval']) : 1;
      chrome.storage.local.remove("stickyTopicMessage");
      return downloader.xhrDownload("text", downloader.URI, (function(_this) {
        return function(event) {
          var i, key, len, message, messages, rawMessage, rawMessages, ref, ref1, storage, topics, value;
          rawMessages = downloader.getMessages(event.target.response);
          storage = {};
          messages = {};
          topics = {};
          ref = rawMessages.timeline;
          for (i = 0, len = ref.length; i < len; i++) {
            rawMessage = ref[i];
            if (Object.keys(messages).length === parseInt(_this.currentSettings['messageCount'])) {
              break;
            }
            message = parser.parse(rawMessage);
            ref1 = message.topics;
            for (key in ref1) {
              if (!hasProp.call(ref1, key)) continue;
              value = ref1[key];
              topics[key] = value;
            }
            if (Object.keys(messages).length < parseInt(_this.currentSettings['messageCount'])) {
              messages[message.id] = message;
            }
          }
          _this.currentSettings['lastSync'] = new Date();
          chrome.storage.local.set({
            "latestMessageIds": Object.keys(messages)
          });
          return chrome.storage.local.get(Object.keys(messages), function(alreadyNotifiedMessages) {
            var categories, category, delay, id;
            delay = 0;
            for (id in messages) {
              message = messages[id];
              if (message.id in alreadyNotifiedMessages) {
                continue;
              }
              categories = (function() {
                var j, len1, ref2, results;
                ref2 = message.categories;
                results = [];
                for (j = 0, len1 = ref2.length; j < len1; j++) {
                  category = ref2[j];
                  results.push(category['slug']);
                }
                return results;
              })();
              if (silently || (_this.currentSettings['selectedCategories'].length > 0 && !intersection(categories, _this.currentSettings['selectedCategories']))) {
                if (message.excerpt.length > 10) {
                  storage[message.id] = {
                    "skipped": true,
                    "targetUrl": message.targetUrl,
                    "excerpt": message.excerpt,
                    "html": message.html,
                    "timePretty": message.timePretty,
                    "thumbnail": message.thumbnail,
                    "categories": message.categories
                  };
                }
              } else {
                (function(message) {
                  return setTimeout(function() {
                    return _this.notifyArticle(message);
                  }, delay);
                })(message);
                delay += 100;
              }
            }
            if (silently && Object.keys(storage).length) {
              console.log("silent iteration, skipping following messages...");
              console.log(storage);
              chrome.storage.local.set(storage);
            }
            return setTimeout(_this.run.bind(_this, false), 60000 * minutesInterval);
          });
        };
      })(this), (function(_this) {
        return function(event) {
          console.log("recovering from network error...");
          return setTimeout(_this.run.bind(_this, false), 60000 * minutesInterval);
        };
      })(this));
    };

    Notifier.prototype.reloadSettings = function(callback) {
      return chrome.storage.sync.get(this.DEFAULT_SYNC_SETTINGS, (function(_this) {
        return function(val) {
          _this.currentSettings = val;
          chrome.storage.sync.clear();
          chrome.storage.sync.set(val);
          if (val['sound'] !== 'no-sound' && ((_this.notificationSound == null) || _this.notificationSound.src.indexOf(val['sound']) === -1)) {
            _this.notificationSound = new Audio('sounds/' + val['sound'] + '.mp3');
          }
          return chrome.storage.local.get(_this.DEFAULT_LOCAL_SETTINGS, function(wal) {
            _this.topics = wal['topics'];
            if (callback != null) {
              return callback();
            }
          });
        };
      })(this));
    };

    Notifier.prototype.notifyArticle = function(message) {
      var meta, options;
      options = JSON.parse(JSON.stringify(this.DEFAULT_NOTIFICATION_OPTIONS));
      meta = {
        "targetUrl": message.targetUrl,
        "excerpt": message.excerpt,
        "html": message.html,
        "skipped": false,
        "timePretty": message.timePretty,
        "thumbnail": message.thumbnail,
        "categories": message.categories,
        "topics": message.topics
      };
      if (!((message.id != null) && (message.text != null))) {
        console.warn("Could not parse the message from the source, skipping...");
        return false;
      }
      options.message = message.text;
      if (message.categories[message.categories.length - 1]['slug'] !== 'hlavna') {
        options.title = message.categories[message.categories.length - 1]['name'];
      }
      if (message.timePretty != null) {
        options.title = "[" + message.timePretty + "] " + options.title;
      }
      if (message.thumbnail != null) {
        options.type = "image";
        options.imageUrl = message.thumbnail;
      }
      this.doNotify(message.id, options, meta);
      return true;
    };

    Notifier.prototype.doNotify = function(id, options, meta) {
      var button, i, len, ref, storage;
      options.iconUrl = chrome.runtime.getURL(this.LOGO);
      options.buttons = [];
      ref = this.BUTTONS;
      for (i = 0, len = ref.length; i < len; i++) {
        button = ref[i];
        options.buttons.push({
          title: button
        });
      }
      storage = {};
      storage[id] = meta;
      chrome.storage.local.set(storage);
      return chrome.notifications.create(id, options, this.creationCallback);
    };

    Notifier.prototype.creationCallback = function(notID) {
      console.log("The nofitication '" + notID + " 'was created.");
      setTimeout((function(_this) {
        return function() {
          return chrome.notifications.clear(notID);
        };
      })(this), 1000 * this.currentSettings['displayTime']);
      if (this.notificationSound != null) {
        return this.notificationSound.play();
      }
    };

    Notifier.prototype.notificationClosed = function(notID, bByUser) {
      return console.log("The notification '" + notID + "' was closed");
    };

    Notifier.prototype.notificationClicked = function(notID) {
      console.log("The notification '" + notID + "' was clicked");
      chrome.notifications.clear(notID);
      if (this.currentSettings['notificationClick'] === 'open') {
        return this.openMessage(notID);
      }
    };

    Notifier.prototype.notificationBtnClick = function(notID) {
      return this.openMessage(notID);
    };

    Notifier.prototype.openMessage = function(notID) {
      return chrome.storage.local.get(notID, function(val) {
        var targetUrl;
        targetUrl = val[notID].targetUrl + "?ref=ext";
        console.log(targetUrl);
        return chrome.tabs.create({
          url: targetUrl
        });
      });
    };

    return Notifier;

  })();

  intersection = function(a, b) {
    var ref, res, value;
    if (a.length > b.length) {
      ref = [b, a], a = ref[0], b = ref[1];
    }
    res = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = a.length; i < len; i++) {
        value = a[i];
        if (indexOf.call(b, value) >= 0) {
          results.push(value);
        }
      }
      return results;
    })();
    return res.length > 0;
  };

  Date.prototype.timeNow = function() {
    return (this.getHours() < 10 ? "0" : "") + this.getHours() + ":" + (this.getMinutes() < 10 ? "0" : "") + this.getMinutes() + ":" + (this.getSeconds() < 10 ? "0" : "") + this.getSeconds();
  };

  notifier = new Notifier(MinutaAjaxDownloader, MinutaAjaxMessageParser);

  notifier.run(true);

}).call(this);
