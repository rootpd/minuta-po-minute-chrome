class MinutaAjaxDownloader
  URI: "https://dennikn.sk/wp-admin/admin-ajax.php?action=minute&home=0&tag="
  ARTICLE_REGEX: /(<article[\s\S]*?<\/article>)/ig

  xhrDownload: (responseType, URI, successCallback, errorCallback) ->
    xhr = new XMLHttpRequest()
    xhr.open("GET", URI)
    xhr.responseType = responseType

    xhr.onload = successCallback
    xhr.onerror = errorCallback
    xhr.send(null)

  getMessages: (response) =>
    response.match(@ARTICLE_REGEX)


class MinutaAjaxMessageParser
  TARGET_URL_REGEX: /https?:\/\/dennikn.sk\/minuta\/(\d+)/
  TIME_REGEX: /(\d{4})-0?(\d+)-0?(\d+)[T ]0?(\d+):0?(\d+):0?(\d+)/
  MESSAGE_REGEX: /<article.*?>(.*?)<\/article>/g
  MESSAGE_EXCERPT_REGEX: /<p>(.*?)<\/p>/gi
  HTML_REGEX: /(<([^>]+)>)/ig
  IMAGE_REGEX: /<img.*?src="(.*?)"/
  ARTICLE_ID_REGEX: /article id="mpm-(\d+)"/
  PRIORITY_REGEX: /article.*?class="([^>]*?)"/
  YOUTUBE_REGEX: /youtube\.com\/embed\/(.*?)[\/\?]/
  TOPIC_REGEX: /"#tema=(.*?)".*?>(.*?)</g

  PRIORITY_STICKY: "sticky"
  PRIORITY_IMPORTANT: "important"

  messageBody: null

  parse: (messageBody) ->
    @messageBody = messageBody.replace /\s+/g," "

    return {
      thumbnail: @getFigure()
      time: @getTimePretty()
      text: @getText()
      html: @getHtml()
      id: @getId()
      targetUrl: @getTargetUrl()
      priority: @getPriority()
      topics: @getTopics()
    }

  getFigure: =>
    matches = @messageBody.match(@IMAGE_REGEX)

    if matches != null && matches.length == 2
      return matches[1]

    matches = @messageBody.match(@YOUTUBE_REGEX)
    if matches? and matches.length == 2
      return "http://img.youtube.com/vi/" + matches[1] + "/mqdefault.jpg"

  getTimePretty: =>
    matches = @messageBody.match(@TIME_REGEX);

    if matches? && matches.length == 7

      #NOTE: Switch to this implementation if N starts using proper timezone
      #date = new Date(matches[0]);
      #return date.getHours() + ":" + date.getMinutes();
      return ("0" + matches[4]).slice(-2) + ":" + ("0" + matches[5]).slice(-2);

  getText: ->
    matches = @messageBody.match(@MESSAGE_EXCERPT_REGEX);
    if (matches? && matches.length > 0)
      value = matches[0].replace(@HTML_REGEX, "")
      return @decodeHtml(value)

  getHtml: ->
    matches = @MESSAGE_REGEX.exec @messageBody
    return matches[1] if matches?

  getId: =>
    matches = @messageBody.match(@ARTICLE_ID_REGEX);
    return matches[1] if matches?

  getTargetUrl: =>
    matches = @messageBody.match(@TARGET_URL_REGEX);
    if (matches? && matches.length == 2)
      return matches[0]

  getPriority: =>
    matches = @messageBody.match(@PRIORITY_REGEX);
    if (matches? && matches.length == 2)
      classes = matches[1];

      return @PRIORITY_IMPORTANT if classes.indexOf("important") != -1
      return @PRIORITY_STICKY if classes.indexOf("sticky") != -1

  getTopics: =>
    topics = {}
    topic = @TOPIC_REGEX.exec @messageBody

    while topic? && topic.length > 2
      topics[topic[1]] = topic[2]
      topic = @TOPIC_REGEX.exec @messageBody

    return topics

  decodeHtml: (html) ->
    txt = document.createElement "textarea"
    txt.innerHTML = html
    return txt.value

class Minuta
  thumbnail: null
  time: null
  message: null
  id: null
  targetUrl: null
  priority: null
  topics: null

  constructor: (@thumbnail, @time, @message, @id, @targetUrl, @priority) ->

class Notifier
  LOGO: "/images/icon512.png"
  BUTTONS: [
    chrome.i18n.getMessage("readMoreButton")
  ]

  DEFAULT_SYNC_SETTINGS:
    "sound": "no-sound"
    "interval": 5
    "messageCount": 3
    "importantOnly": false
    "displayTime": 10
    "notificationClick": "open"
    "snooze": "off"

  DEFAULT_LOCAL_SETTINGS:
    "selectedTopic": "0"
    "topics": {}

  DEFAULT_NOTIFICATION_OPTIONS:
    type : "basic"
    title: chrome.i18n.getMessage("notificationTitle")
    message: null
    priority: 1

  notificationSound: null
  currentSettings: {}
  downloader: null
  parser: null
  topics: {}
  selectedTopic: "0"

  constructor: (@downloader, @parser) ->
    chrome.notifications.onClosed.addListener @notificationClosed;
    chrome.notifications.onClicked.addListener @notificationClicked;
    chrome.notifications.onButtonClicked.addListener @notificationBtnClick;

  run: (forceSilent) ->
    downloader = new @downloader();
    parser = new @parser();

    @reloadSettings =>
      @downloadMessages downloader, parser, forceSilent

  downloadMessages: (downloader, parser, silently) =>
    if not silently
      silently = @currentSettings['snooze'] != 'off' and @currentSettings['snooze'] > (new Date()).getTime()

    minutesInterval =
      if @currentSettings['interval']? and parseInt(@currentSettings['interval']) >= 1
      then parseInt(@currentSettings['interval']) else 1

    chrome.storage.local.remove("stickyTopicMessage");

    downloader.xhrDownload "text", downloader.URI + @selectedTopic, (event) =>
      rawMessages = downloader.getMessages event.target.response;
      storage = {}
      messages = {}

      for rawMessage in rawMessages
        break if Object.keys(messages).length == parseInt(@currentSettings['messageCount'])

        message = parser.parse rawMessage

        if message.priority is parser.PRIORITY_STICKY
          if @selectedTopic == "0"
            @updateTopics message
          else
            @updateStickyTopicMessage message

          continue

        messages[message.id] = message

      chrome.storage.local.get Object.keys(messages), (alreadyNotifiedMessages) =>
        delay = 0
        for id, message of messages
          continue if message.id of alreadyNotifiedMessages

          if (silently) or (@currentSettings['importantOnly'] and message.priority != parser.PRIORITY_IMPORTANT)
            storage[message.id] = { "skipped": true, "targetUrl": message.targetUrl }
          else
            do (message) =>
              setTimeout =>
                @notifyArticle message
              , delay
            delay += 100 # because we're trying to be sure it gets executed in proper order

        if silently and Object.keys(storage).length
          console.log "silent iteration, skipping following messages..."
          console.log storage
          chrome.storage.local.set storage

        setTimeout @run.bind(this, false), 60000 * minutesInterval

  reloadSettings: (callback) =>
    chrome.storage.sync.get @DEFAULT_SYNC_SETTINGS, (val) =>
      @currentSettings = val;
      chrome.storage.sync.clear()
      chrome.storage.sync.set val

      if val['sound'] != 'no-sound' and (not @notificationSound? or @notificationSound.src.indexOf(val['sound']) == -1)
        @notificationSound = new Audio('sounds/' + val['sound'] + '.mp3')
        
      chrome.storage.local.get @DEFAULT_LOCAL_SETTINGS, (wal) =>
        @selectedTopic = wal['selectedTopic']
        @topics = wal['topics']
        callback() if callback?


  updateTopics: (message) =>
    if Object.keys(@topics).toString() != Object.keys(message.topics).toString()
      chrome.storage.local.set {
        "topics": message.topics
      }, =>
        @topics = message.topics

  updateStickyTopicMessage: (message) ->
    chrome.storage.local.set {
      "stickyTopicMessage": message.html
    }

  notifyArticle: (message) ->
    options = JSON.parse(JSON.stringify(@DEFAULT_NOTIFICATION_OPTIONS));
    meta =
      "targetUrl": message.targetUrl

    unless (message.id? and message.text?)
      console.warn("Could not parse the message from the source, skipping...");
      return false;

    options.message = message.text;
    options.title = @topics[@selectedTopic] unless @selectedTopic is "0"

    if message.time?
      options.title = "[" + message.time + "] " + options.title

    if message.thumbnail?
      options.type = "image"
      options.imageUrl = message.thumbnail

    @doNotify message.id, options, meta

    return true


  doNotify: (id, options, meta) ->
    options.iconUrl = chrome.runtime.getURL(@LOGO);

    options.buttons = [];
    for button in @BUTTONS
      options.buttons.push { title: button };

    storage = {};
    storage[id] = meta;
    chrome.storage.local.set storage;
    chrome.notifications.create id, options, @creationCallback


  creationCallback: (notID) =>
    console.log "The nofitication '" + notID + " 'was created."

    setTimeout =>
      chrome.notifications.clear(notID);
    , 1000 * @currentSettings['displayTime']

    @notificationSound.play() if @notificationSound?


  notificationClosed: (notID, bByUser) =>
    console.log "The notification '" + notID + "' was closed"


  notificationClicked: (notID) =>
    console.log "The notification '" + notID + "' was clicked"
    chrome.notifications.clear notID

    if @currentSettings['notificationClick'] == 'open'
      @openMessage notID


  notificationBtnClick: (notID) =>
    @openMessage(notID)


  openMessage: (notID) =>
    #noinspection JSUnresolvedVariable
    #noinspection JSUnresolvedVariable
    chrome.storage.local.get notID, (val) ->
      targetUrl = val[notID].targetUrl;
      chrome.tabs.create {url: targetUrl}


########################
# MAIN
########################

notifier = new Notifier(MinutaAjaxDownloader, MinutaAjaxMessageParser)
notifier.run true