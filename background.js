'use strict';

const RESET_AFTER_HOURS = 6;

const HOUR = 36e5; // 60 * 60 * 1000;
const modes = ['diff', 'total', 'fuck'];

const {local} = chrome.storage;
const {name} = chrome.runtime.getManifest();

function setBadge(mode, text = '', color = [0, 0, 0, 0]) {
	const {setBadgeText, setBadgeBackgroundColor, setTitle} = chrome.browserAction;

	setBadgeText({text: `${text}`});
	setBadgeBackgroundColor({color});

	setTitle({
		title: name + (mode ? `| mode: ${mode}` : '')
	});
}

function updateBadge() {
	local.get(['mode', 'last'], ({mode, last: {total, delta}}) => {
		if (mode === 'fuck') return setBadge();
		if (mode === 'total') return setBadge(mode, total);

		let n;

		if (mode === 'diff') n = delta;
		// if (mode === 'split') n = `${opened}|${closed}`;

		if (Math.abs(delta) < 10) {
			setBadge(mode, n);
			return;
		}

		setBadge(mode, n, delta > 0 ? '#F00' : '#0F0');
	});
}

class Tabs {
	constructor() {
		this.restore();
	}

	setTo({ts = +new Date, base, opened = 0, closed = 0}) {
		this.ts = ts;
		this.base = base;
		this.opened = opened;
		this.closed = closed;
	}

	restore() {
		local.get('last', ({last}) => {
			if (last) {
				return this.setTo(last);
			}

			this.reset();
		});
	}

	reset(n = 0) {
		chrome.tabs.query({}, tabs => {
			this.setTo({base: tabs.length});
			this.delta = n;
		});

		local.set({start: +new Date});
	}

	get total() {
		return this.base + this.delta;
	}

	get delta() {
		return this.opened - this.closed;
	}

	// NOTE: Only sign of `n` matters.
	set delta(n) {
		if (this.expired) {
			return this.reset(n);
		}

		if (n > 0) this.opened++;
		if (n < 0) this.closed++;

		this.save();
	}

	get expired() {
		return +new Date - this.ts >= RESET_AFTER_HOURS * HOUR;
	}

	save() {
		const last = {...this, total: this.total, delta: this.delta, expired: this.expired};
		local.set({last});

		console.log(last);
		updateBadge();
	}
}

const allTabs = new Tabs();

let init = () => {
	init = () => {};

	const {onCreated, onRemoved} = chrome.tabs;
	onCreated.addListener(() => allTabs.delta = 1);
	onRemoved.addListener(() => allTabs.delta = -1);

	updateBadge();

	// Move to next mode on click
	chrome.browserAction.onClicked.addListener(() => {
		local.get('mode', ({mode}) => {
			const idx = modes.indexOf(mode) + 1;
			local.set({mode: modes[idx % modes.length]}, updateBadge);
		});
	});
};

const {onInstalled, onStartup} = chrome.runtime;
onInstalled.addListener(init);
onStartup.addListener(init);
