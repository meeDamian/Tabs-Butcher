'use strict';

const RESET_AFTER_HOURS = 6;
const HOUR = 36e5; // 60 * 60 * 1000;

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

	get expired() {
		return +new Date - this.ts >= RESET_AFTER_HOURS * HOUR;
	}

	get total() {
		return this.base + this.delta;
	}

	get delta() {
		return this.opened - this.closed;
	}

	// NOTE: Only the sign of `n` matters.
	set delta(n) {
		if (this.expired) {
			return this.reset(n);
		}

		if (n === 0) return;
		if (n > 0) this.opened++;
		if (n < 0) this.closed++;

		this.save();
	}

	save() {
		const {total, delta, expired} = this;
		const last = {...this, total, delta, expired};
		console.log(last);

		local.set({last});
	}
}

function initState() {
	const allTabs = new Tabs();

	const {onCreated, onRemoved} = chrome.tabs;
	onCreated.addListener(() => allTabs.delta = 1);
	onRemoved.addListener(() => allTabs.delta = -1);
}
