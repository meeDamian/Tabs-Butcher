'use strict';

#
# Variables
#
todayOnBadge = null

deviceId = null
currentDay = null
affectionWasShown = false

tabs =
  all: 0
  today: 0


streakBadges =
  1:
    image: 'images/star1.png'
    title: chrome.i18n.getMessage 'streak1_title'
    msg: chrome.i18n.getMessage 'streak1_message'
    # btn:
    #   txt: 'More about Euler\'s totient fn'
    #   url: 'http://goo.gl/7ZPb2C'


  3:
    image: 'images/css3.png'
    title: chrome.i18n.getMessage 'streak3_title'
    msg: chrome.i18n.getMessage 'streak3_message'
    # btn:
    #   txt: 'See awesome CSS3 goodies'
    #   url: ''

  5:
    image: 'images/html5.png'
    title: chrome.i18n.getMessage 'streak5_title'
    msg: chrome.i18n.getMessage 'streak5_message'
    # btn:
    #   txt: 'Feed me HTML5 magic!'
    #   url: ''


#
# Definitions
#
getToday = ->
  today = new Date()
  today.setHours 0, 0, 0, 0 # Leave the date; null the time
  today

getYesterday = ->
  yesterday = getToday()
  yesterday.setDate yesterday.getDate() - 1
  yesterday

getObj = (key, val) ->
  k = deviceId
  k += '_' + key if key

  o = {}
  o[k] = val
  o


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


# Notifications stuff
showLoveNotification = ->
  p = Math.floor Math.abs(tabs.today) * 100 / tabs.all
  chrome.notifications.create deviceId + '_' + tabs.today,
    type: 'progress'
    iconUrl: 'images/heart128.png'

    progress: p

    title: chrome.i18n.getMessage 'love20_title', [20]
    message: chrome.i18n.getMessage 'love20_message'
    contextMessage: chrome.i18n.getMessage 'love20_context', [p]
  , ->


showAwesomeNotification = (n) ->
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

showBasicNotification = (n) ->
  chrome.notifications.create deviceId + '_' + currentDay,
    type: 'basic'
    iconUrl: 'images/icon38.png'

    title: chrome.i18n.getMessage 'basicStreak_title', [n]
    message: chrome.i18n.getMessage 'basicStreak_message'
  , ->

showNotification = (n) ->
  if streakBadges[n]?
    showAwesomeNotification streakBadges[n]

  else if n > 0
    showBasicNotification n


# Badge stuff
getBadgeKey = -> deviceId + '_badgeState'
saveBadgeState = (state, cb) ->
  chrome.storage.sync.set getObj('badgeState', state), cb

getBadgeState = (cb) ->
  return cb todayOnBadge unless todayOnBadge is null

  chrome.storage.sync.get getObj('badgeState', false), (result) ->
    todayOnBadge = result[getBadgeKey()]
    cb todayOnBadge

setBadge = (number, color) ->
  chrome.browserAction.setBadgeText text: '' + Math.abs number
  chrome.browserAction.setBadgeBackgroundColor color: color

updateBadge = ->
  getBadgeState (badgeState) ->
    if badgeState then setBadge tabs.all, '#5677fc'
    else
      setBadge tabs.today, if tabs.today > 0 then '#e51c23' else '#259b24'

changeTabsCount = (n) ->
    tabs.today + n
    tabs.all + n
    saveTabs()
    updateBadge()

changeBadge = ->
  todayOnBadge = not todayOnBadge
  saveBadgeState todayOnBadge, updateBadge


checkStreak = (days, cb) ->
  lastKnownDay = days.reduce (prev, current) ->
    return current if current.date > prev.date
    prev

  , date: -1

  currentStreak = 0

  if lastKnownDay.date is getYesterday().getTime()
    currentStreak = 1

    if lastKnownDay.streak?
      currentStreak = lastKnownDay.streak + 1

  cb currentStreak

saveDay = (cb) ->
  chrome.storage.sync.remove deviceId + '_' + getYesterday().getTime()
  chrome.storage.sync.get getObj(null, []), (result) ->
    checkStreak result[deviceId], (days) ->
      toSave =
        date: currentDay.getTime()
        tabsAll: tabs.all
        tabsToday: tabs.today

      if days > 0
        toSave.streak = days
        chrome.browserAction.setTitle title: chrome.i18n.getMessage 'badgeTitle', [days]

      result[deviceId].push toSave

      chrome.storage.sync.set result, ->
        cb days

checkDate = ->
  now = getToday()

  currentDay = now unless currentDay

  if now.getTime() is currentDay.getTime()
    return updateBadge()

  saveDay (streakDays) ->
    tabs.today = 0
    currentDay = now
    affectionWasShown = false

    updateBadge()
    showNotification streakDays

saveTabs = -> chrome.storage.sync.set getObj getToday().getTime(), tabs
getTabs = (cb) ->
  chrome.storage.sync.get getObj(getToday().getTime(), null), (result) ->
    cb result[deviceId + '_' + getToday().getTime()]



# Listeners
initListeners = ->
  chrome.browserAction.onClicked.addListener changeBadge
  chrome.tabs.onActivated.addListener checkDate
  chrome.tabs.onCreated.addListener -> changeTabsCount 1
  chrome.tabs.onRemoved.addListener ->
    changeTabsCount -1

    if tabs.today is -20 and not affectionWasShown
      affectionWasShown = true
      showLoveNotification()

#
# Main logic
#
getBrowserId (id) ->
  deviceId = id

  getCurrentTabsCount (tabsCnt) ->
    tabs.all = tabsCnt

    getTabs (t) ->
      tabs.today = t.today if t isnt null

      updateBadge()
      initListeners()