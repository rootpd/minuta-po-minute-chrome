class MinutaAjaxDownloader
  URI: "https://dennikn.sk/api/minute"
  ARTICLE_REGEX: /(<article[\s\S]*?<\/article>)/ig

  xhrDownload: (responseType, URI, successCallback, errorCallback) ->
    xhr = new XMLHttpRequest()
    xhr.open("GET", URI)
    xhr.responseType = responseType

    xhr.onload = successCallback
    xhr.onerror = errorCallback
    xhr.send(null)

  getMessages: (response) =>
    JSON.parse(response)


class MinutaAjaxMessageParser
  HTML_REGEX: /(<([^>]+)>)/ig
  YOUTUBE_REGEX: /youtube\.com\/embed\/(.*?)[\/\?]/

  PRIORITY_STICKY: "sticky"
  PRIORITY_IMPORTANT: "important"

  message: null

  parse: (message) ->
    @message = message

    return {
      thumbnail: @getFigure()
      timePretty: @getTimePretty()
      text: @getText()
      html: @getHtml()
      excerpt: @getHtmlExcerpt()
      id: @getId()
      targetUrl: @getTargetUrl()
      priority: @getPriority()
      topics: @getTopics()
      categories: @getCategories()
    }

  getFigure: =>
    return @message['image']['large'] if @message['image']? and @message['image']['large']?

    if @message['embed']?
      matches = @message['embed']['html'].match(@YOUTUBE_REGEX)
      if matches? and matches.length == 2
        return "http://img.youtube.com/vi/" + matches[1] + "/mqdefault.jpg"

  getTimePretty: =>
      # expecting 2017-05-16T06:14:53 format (no explicit timezone, in UTC)
      date = new Date(@message['created']);
      userTimezoneOffset = date.getTimezoneOffset() * -60000;
      return (new Date(date.getTime() + userTimezoneOffset)).timeNow()

  getText: ->
    value = @message['content']['main'].replace(@HTML_REGEX, "")
    return @decodeHtml(value)

  getHtmlExcerpt: ->
    @message['content']['main']

  getHtml: ->
    if @message['content']['extended']?
      html = @message['content']['extended']
    else
      html = @message['content']['main']

    figure = @getFigure()
    if figure?
      html += "<p><img src='" + figure + "' /></p>"

    return html

  getId: =>
    @message['id'].toString()

  getTargetUrl: =>
    @message['url']

  getPriority: =>
    return @PRIORITY_IMPORTANT if @message['important']? and @message['important'] == true
    return @PRIORITY_STICKY if @message['sticky']? and @message['sticky'] == true

  getTopics: =>
    topics = {}
    return topics unless @message['tag']

    for tag in @message['tag']
      topics[tag['slug']] = tag['name']

    topics

  getCategories: =>
    return @message['cat']

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
  NO_TOPIC: ""
  LOGO: "/images/icon512.png"
  BUTTONS: [
    chrome.i18n.getMessage("readMoreButton")
  ]

  DEFAULT_SYNC_SETTINGS:
    "sound": "no-sound"
    "interval": 5
    "messageCount": 10
    "displayTime": 10
    "notificationClick": "open"
    "snooze": "off"
    "lastSync": Date.now()
    "selectedCategories": []

  DEFAULT_LOCAL_SETTINGS:
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

  constructor: (@downloader, @parser) ->
    chrome.storage.local.clear()
    
    chrome.notifications.onClosed.addListener @notificationClosed;
    chrome.notifications.onClicked.addListener @notificationClicked;
    chrome.notifications.onButtonClicked.addListener @notificationBtnClick;

  run: (forceSilent) =>
    downloader = new @downloader();
    parser = new @parser();

    @reloadSettings =>
      @downloadMessages downloader, parser, forceSilent

  downloadMessages: (downloader, parser, silently) =>
    if not silently
      silently = @currentSettings['snooze'] != 'off' and @currentSettings['snooze'] > Date.now()

    minutesInterval =
      if @currentSettings['interval']? and parseInt(@currentSettings['interval']) >= 1
      then parseInt(@currentSettings['interval']) else 1

    chrome.storage.local.remove("stickyTopicMessage");

    downloader.xhrDownload "text", downloader.URI, (event) =>
      rawMessages = downloader.getMessages event.target.response;
      storage = {}
      messages = {}
      topics = {}

      for rawMessage in rawMessages.timeline
        break if Object.keys(messages).length == parseInt(@currentSettings['messageCount'])

        message = parser.parse rawMessage
        for own key, value of message.topics
          topics[key] = value

        if Object.keys(messages).length < parseInt(@currentSettings['messageCount'])
          messages[message.id] = message

      @currentSettings['lastSync'] = new Date()
      chrome.storage.local.set {"latestMessageIds": Object.keys(messages)}
      chrome.storage.local.get Object.keys(messages), (alreadyNotifiedMessages) =>
        delay = 0
        for id, message of messages
          continue if message.id of alreadyNotifiedMessages

          categories = (category['slug'] for category in message.categories)
          if silently || (@currentSettings['selectedCategories'].length > 0 && !intersection(categories, @currentSettings['selectedCategories']))
            storage[message.id] = {
              "skipped": true
              "targetUrl": message.targetUrl
              "excerpt": message.excerpt
              "html": message.html
              "timePretty": message.timePretty
              "thumbnail": message.thumbnail
              "categories": message.categories
            } if message.excerpt.length > 10
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
    , (event) =>
      console.log "recovering from network error..."
      setTimeout @run.bind(this, false), 60000 * minutesInterval

  reloadSettings: (callback) =>
    chrome.storage.sync.get @DEFAULT_SYNC_SETTINGS, (val) =>
      val['selectedCategories'] = [] if val['selectedCategories'] == null
      @currentSettings = val;
      chrome.storage.sync.clear()
      chrome.storage.sync.set val

      if val['sound'] != 'no-sound' and (not @notificationSound? or @notificationSound.src.indexOf(val['sound']) == -1)
        @notificationSound = new Audio('sounds/' + val['sound'] + '.mp3')
        
      chrome.storage.local.get @DEFAULT_LOCAL_SETTINGS, (wal) =>
        @topics = wal['topics']
        callback() if callback?


  notifyArticle: (message) =>
    options = JSON.parse(JSON.stringify(@DEFAULT_NOTIFICATION_OPTIONS));
    meta =
      "targetUrl": message.targetUrl
      "excerpt": message.excerpt
      "html": message.html
      "skipped": false
      "timePretty": message.timePretty
      "thumbnail": message.thumbnail
      "categories": message.categories
      "topics": message.topics

    unless (message.id? and message.text?)
      console.warn("Could not parse the message from the source, skipping...");
      return false;

    options.message = message.text
    if message.categories[message.categories.length-1]['slug'] != 'hlavna'
      options.title = message.categories[message.categories.length - 1]['name']

    if message.timePretty?
      options.title = "[" + message.timePretty + "] " + options.title

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
    @openMessage notID


  openMessage: (notID) =>
    chrome.storage.local.get notID, (val) ->
      targetUrl = val[notID].targetUrl + "?ref=ext";
      console.log targetUrl
      chrome.tabs.create {url: targetUrl}

intersection = (a, b) ->
  [a, b] = [b, a] if a.length > b.length
  res = (value for value in a when value in b)
  return res.length > 0

########################
# MAIN
########################

Date.prototype.timeNow = ->
  return (if @getHours() < 10 then "0" else "") + @getHours() + ":" +
      (if @getMinutes() < 10 then "0" else "") + @getMinutes() + ":" +
      (if @getSeconds() < 10 then "0" else "") + @getSeconds()

notifier = new Notifier(MinutaAjaxDownloader, MinutaAjaxMessageParser)
notifier.run true

#chrome.webRequest.onErrorOccurred.addListener (details) ->
#  console.log details