'use strict';

todayOnBadge = true

currentDay = 0
deviceId = null

tabs =
  all: 0
  today: 0

getBrowserId = (cb) ->
  generateNewId = ->
    randomPool = new Uint8Array 8
    crypto.getRandomValues randomPool

    (val.toString 16 for val in randomPool).join ''

  saveId = (id, _cb) -> chrome.storage.local.set deviceId:id, -> _cb id

  chrome.storage.local.get 'deviceId', (items) ->
    return cb items.deviceId if items.deviceId

    saveId generateNewId(), (id) -> cb id

getCurrentTabsCount = (cb) ->
  chrome.windows.getAll populate:true, (windows) ->
    cb windows.reduce (cnt, window) ->
      cnt + window.tabs.length
    , 0

saveDay = (tabs, year, month, day) ->
  obj = {}
  obj['#{year}-#{month}-#{day}'] =
    tabs: tabs
    id: deviceId

  chrome.storage.sync.set obj

getCurrentTabsCount (tabsCnt) ->
  tabs.all = tabsCnt
  updateBadge()

getBrowserId (id) ->
  deviceId = id

chrome.tabs.onCreated.addListener ->
  tabs.today++
  tabs.all++
  updateBadge()

chrome.tabs.onRemoved.addListener ->
  tabs.today--
  tabs.all--
  updateBadge()

changeBadge = ->
  todayOnBadge = not todayOnBadge
  updateBadge()

setBadge = (number, color) ->
  chrome.browserAction.setBadgeText text: '' + Math.abs number
  chrome.browserAction.setBadgeBackgroundColor color: color

updateBadge = ->
  if todayOnBadge then setBadge tabs.all, '#5677fc'
  else
    setBadge tabs.today, if tabs.today > 0 then '#e51c23' else '#259b24'

chrome.browserAction.onClicked.addListener changeBadge

checkDate = ->
  now = new Date()
  now.setHours 0, 0, 0, 0

  unless currentDay
    tabs.today = 0
    currentDay = now

  if now.getTime() isnt currentDay.getTime()

    saveDay tabs.today,
      currentDay.getYear()
      currentDay.getMonth() + 1
      currentDay.getDate()


setInterval checkDate, 1000
