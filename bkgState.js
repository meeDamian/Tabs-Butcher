'use strict';

const RESET_AFTER_HOURS = 6;
const HOUR = 36e5; // 60 * 60 * 1000;

const {local} = chrome.storage;

class Tabs {
	constructor() {
		this.restore();
	}

	setTo(last, delta) {
		if (!last) {
			local.set({start: +new Date});
		}

		const {ts = +new Date, base, opened = 0, closed = 0} = last || {};

		chrome.tabs.query({}, tabs => {
			this.ts = ts;
			this.base = base || tabs.length;
			this.opened = opened;
			this.closed = closed;

			if (delta) {
				this.delta = delta;
			}
		});
	}

	restore() {
		local.get('last', ({last}) => this.setTo(last));
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
			return this.setTo(undefined, n);
		}

		if (n === 0) return;
		if (n > 0) this.opened++;
		if (n < 0) this.closed++;

		this.save();
	}

	save() {
		// Get prop values from all getters
		const {total, delta, expired} = this;

		// Combine "raw props" with all "getter props"
		const last = {...this, total, delta, expired};

		console.log(last);
		local.set({last});
	}
}

function appendHistory(event) {
	local.get('history', ({history = []}) => {
		local.getBytesInUse(null, total => {
			if (total >= .9 * local.QUOTA_BYTES) {
				console.log(`Used storage exceeds quota: ${history.length} history records ${total}/${local.QUOTA_BYTES}`);
				history = history.slice(-Math.floor(history.length * .1));
			}

			event.usedStorage = `${(100 * total / local.QUOTA_BYTES).toFixed(2)}%`;

			history.push(event);

			local.set({history});

			// Only print last 42 elements
			console.log(history.slice(-42));
		});
	});
}


function change(n) {
	if (n === 0) return () => {};

	return tab => {
		allTabs.delta = n;

		const o = {ts: +new Date};

		if (n < 0) {
			o.event = 'tabClose';
			o.id = tab;
		}

		if (n > 0) {
			const {id, windowId, openerTabId} = tab || {};

			o.event = 'tabOpen';
			o.id = id;
			o.windowId = windowId;
			o.openerTabId = openerTabId;
		}

		local.get('start', ({start}) => {
			if (start) {
				o.session = {
					start,
					duration: o.ts - start,
					ago: fmtDate(start, true)
				};
			}

			appendHistory(o);
		});
	};
}

const allTabs = new Tabs();

chrome.tabs.onCreated.addListener(change(1));
chrome.tabs.onRemoved.addListener(change(-1));

chrome.runtime.onMessage.addListener((data, sender) => appendHistory({sender, data}));
