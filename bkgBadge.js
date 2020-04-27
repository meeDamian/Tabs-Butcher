'use strict';

const [updateBadge, nextMode] = (() => {
	const {setBadgeText, setBadgeBackgroundColor, setTitle} = chrome.browserAction;

	function setBadge(mode, text = '', color = [0, 0, 0, 0]) {

		setBadgeText({text: `${text}`});
		setBadgeBackgroundColor({color});

		setTitle({
			title: APP_NAME + (mode ? `| mode: ${mode}` : '')
		});
	}

	function updateBadge() {
		local.get(['mode', 'last'], ({mode, last}) => {
			const {total, delta} = last || {};

			if (mode === 'fuck') return setBadge();
			if (mode === 'total') return setBadge(mode, total < 1e3 ? total : '∞');

			// Set vanilla badge background color, if -10 < delta < 10
			if (Math.abs(delta) < 10) {
				return setBadge(mode, delta);
			}

			// Color badge background if -10 >= delta >= 10
			setBadge(mode, delta, delta > 0 ? '#F00' : '#0F0');
		});
	}

	function nextMode() {
		local.get('mode', ({mode}) => {
			const idx = MODES.indexOf(mode) + 1;
			local.set({mode: MODES[idx % MODES.length]}, updateBadge);
		});
	}

	return [updateBadge, nextMode];
})();

function initBadge() {
	updateBadge();

	// Make badge clicks toggle through modes
	chrome.browserAction.onClicked.addListener(nextMode);
	chrome.storage.onChanged.addListener(updateBadge);
}
