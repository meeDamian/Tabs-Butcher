'use strict';

const RESET_AFTER_HOURS = 6;

const HOUR = 36e5; // 60 * 60 * 1000;

class Tabs {
	constructor() {
		this.restore()
	}

	setTo({ts = +new Date, base, opened = 0, closed = 0}) {
		this.ts = ts;
		this.base = base;
		this.opened = opened;
		this.closed = closed;
	}

	restore() {
		chrome.storage.local.get('last', ({last}) => {
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

		chrome.storage.local.set({start: +new Date});
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

		console.log(last);
		chrome.storage.local.set({last});
	}
}

const allTabs = new Tabs();

let init = () => {
	init = () => {};

	const {onCreated, onRemoved} = chrome.tabs;
	onCreated.addListener(() => allTabs.delta = 1);
	onRemoved.addListener(() => allTabs.delta = -1);
}

const {onInstalled, onStartup} = chrome.runtime;
onInstalled.addListener(init);
onStartup.addListener(init);
