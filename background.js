'use strict';

const {local} = chrome.storage;
const {name: APP_NAME} = chrome.runtime.getManifest();

const MODES = ['diff', 'total', 'fuck'];

let init = () => {
	init = () => {};

	initState();
	initBadge();
};

const {onInstalled, onStartup} = chrome.runtime;
onInstalled.addListener(init);
onStartup.addListener(init);
