'use strict';

#
# Variables
#
todayOnBadge = true

deviceId = null
currentDay = 0
streak = 0

tabs =
  all: 0
  today: 0


##### TEMP HACK
chrome.storage.sync.clear()
setTimeout ->
  currentDay = new Date()
  currentDay.setHours 0, 0, 0, 0
  currentDay.setDate currentDay.getDate() - 1
, 10000


streakBadges =
  1:
    image: 'images/star1.png'
    title: 'Awesome first step'
    msg: '1 is the only odd number in the range of Euler\'s totient fn φ(x); (for x = 1 or 2)'
    # btn:
    #   txt: 'More about Euler\'s totient fn'
    #   url: 'http://goo.gl/7ZPb2C'


  3:
    image: 'images/css3.png'
    title: 'And you keep going!'
    msg: 'You\'re as awesome as CSS3'
    # btn:
    #   txt: 'See awesome CSS3 goodies'
    #   url: ''

  5:
    image: 'images/html5.png'
    title: 'Nobody can stop you, can\'t they‽'
    msg: 'You\'re as awesome as CSS3'
    # btn:
    #   txt: 'Feed me HTML5 magic!'
    #   url: ''


#
# Definitions
#
getBrowserId = (cb) ->
  generateNewId = ->
    randomPool = new Uint8Array 8
    crypto.getRandomValues randomPool

    (val.toString 16 for val in randomPool).join ''

  saveId = (id, _cb) -> chrome.storage.local.set deviceId:id, -> _cb id

  chrome.storage.local.get 'deviceId', (items) ->
    return cb items.deviceId if items.deviceId

    saveId generateNewId(), cb

getCurrentTabsCount = (cb) ->
  chrome.windows.getAll populate:true, (windows) ->
    cb windows.reduce (cnt, window) ->
      cnt + window.tabs.length
    , 0

saveDay = (cb) ->
  o = {}
  o[deviceId] = []

  chrome.storage.sync.get o, (result) ->
    result[deviceId].push
      date: currentDay
      tabsAll: tabs.all
      tabsToday: tabs.today

    chrome.storage.sync.set result, ->
      cb result[deviceId]

checkStreak = (days, cb) ->
  console.log days
  cb 1

checkDate = ->
  now = new Date()
  now.setHours 0, 0, 0, 0 # Leave the date; null the time

  currentDay = now unless currentDay

  if now.getTime() isnt currentDay.getTime()
    saveDay (days) ->
      tabs.today = 0
      currentDay = now

      checkStreak days, (n) ->
        if streakBadges[n]?
          showNotification n

# Notifications stuff
showNotification = (number) ->
  return 'nope'
  n = streakBadges[number]
  chrome.notifications.create deviceId + '_' + currentDay,
    type: 'image'
    priority: 2
    iconUrl: 'images/icon38.png'
    imageUrl: n.image

    title: n.title
    message: n.msg
    # buttons: [
    #   title: n.btn.txt
    # ]
  , ->


# Badge stuff
setBadge = (number, color) ->
  chrome.browserAction.setBadgeText text: '' + Math.abs number
  chrome.browserAction.setBadgeBackgroundColor color: color

updateBadge = ->
  if todayOnBadge then setBadge tabs.all, '#5677fc'
  else
    setBadge tabs.today, if tabs.today > 0 then '#e51c23' else '#259b24'

changeBadge = ->
  todayOnBadge = not todayOnBadge
  updateBadge()


# Listeners
chrome.browserAction.onClicked.addListener changeBadge

chrome.tabs.onCreated.addListener ->
  tabs.today++
  tabs.all++
  updateBadge()

chrome.tabs.onRemoved.addListener ->
  tabs.today--
  tabs.all--
  updateBadge()


# Ticker
setInterval checkDate, 1000


#
# Main logic
#
getBrowserId (id) ->
  deviceId = id

  getCurrentTabsCount (tabsCnt) ->
    tabs.all = tabsCnt
    updateBadge()