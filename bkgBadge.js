'use strict';

const [updateBadge, nextMode] = (() => {
	const MODES = ['diff', 'total', 'fuck'];

	const {setBadgeText, setBadgeBackgroundColor, setTitle} = chrome.browserAction;
	const {name: APP_NAME} = chrome.runtime.getManifest();

	function setBadge(mode, text = '', color = [0, 0, 0, 0]) {
		setBadgeText({text: `${text}`});
		setBadgeBackgroundColor({color});

		setTitle({
			title: [APP_NAME, mode ? `mode: ${mode}` : undefined].filter(v => !!v).join(' | ')
		});

	}

	async function updateBadge() {
		const {mode, last = {}} = await localGet(['mode', 'last']);

		const {total, delta} = last;

		if (mode === 'fuck') return setBadge();
		if (mode === 'total') return setBadge(mode, total < 1e3 ? total : '∞');

		// Set vanilla badge background color, if -10 < delta < 10
		if (Math.abs(delta) < 10) {
			return setBadge(mode, delta);
		}

		// Color badge background if -10 >= delta >= 10
		setBadge(mode, delta, delta > 0 ? '#F00' : '#0F0');
	}

	async function nextMode() {
		const {mode} = await localGet(['mode']);
		const idx = MODES.indexOf(mode) + 1;

		await localSet({mode: MODES[idx % MODES.length]})
			.then(updateBadge);
	}

	return [updateBadge, nextMode];
})();


// Make badge clicks toggle through modes
chrome.browserAction.onClicked.addListener(nextMode);

// Update badge whenever sth new is saved
chrome.storage.onChanged.addListener(updateBadge);

// Update badge whenever browser starts
chrome.runtime.onStartup.addListener(updateBadge);

// Update badge right after extension is installed
chrome.runtime.onInstalled.addListener(updateBadge);

