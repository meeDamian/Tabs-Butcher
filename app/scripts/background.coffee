'use strict';

getBrowserUuid = (cb) ->
  generateNewId = -> 'B2FHI190UBKYIX0BGCMR'
  saveId = (id, _cb) -> chrome.storage.local.set deviceId:id, -> _cb id

  chrome.storage.local.get 'deviceId', (items) ->
    return cb items.deviceId if items.deviceId

    saveId generateNewId, (id) -> cb id


getCurrentCount = (cb) ->
  cntTabs = (cnt, window) -> cnt + window.tabs.length

  chrome.windows.getAll populate:true, (windows) ->
    cb windows.reduce cntTabs, 0

getCurrentCount (tabsCnt) ->
  console.log tabsCnt
  console.log getBrowserUuid()