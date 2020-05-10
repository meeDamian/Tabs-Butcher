'use strict';

const RESET_AFTER_HOURS = 6;
const HOUR = 36e5; // 60 * 60 * 1000;

const {local} = chrome.storage;

const localGet = promisify(local.get.bind(local));
const localSet = promisify(local.set.bind(local));
const localBytes = promisify(local.getBytesInUse.bind(local));
const tabsQuery = promisify(chrome.tabs.query.bind(chrome.tabs));


const appendHistory = (() => {
	const fmt = (v, unit, p = 2) => `${v.toPrecision(p)}${unit}`;
	const toMB = v => fmt(v / (1 << 20), 'MB');

	const queue = [];

	async function trimStorageIfNeeded(history) {
		const used = await localBytes(null);

		if (used < .9 * local.QUOTA_BYTES) {
			return [history, used];
		}

		const excess = Math.floor(history.length * .1);

		console.warn('WARNING: Used storage exceeds 90% of allowed quota, trimming oldest entries…', {
			storage: {
				allowed: toMB(local.QUOTA_BYTES),
				used: toMB(used),
				percent: fmt(100 * used / local.QUOTA_BYTES, '%')
			},
			rows: {
				current: history.length,
				'to be trimmed': excess
			}
		});

		return [history.slice(-excess), used];
	}

	async function append(event) {
		const {history = []} = await localGet('history');
		const [h, used] = await trimStorageIfNeeded(history);
		event.usedStorage = fmt(100 * used / local.QUOTA_BYTES, '%');

		h.push(event);

		await localSet({history: h});
	}

	return event => {
		const promise = Promise.all(queue)
			.then(() => append(event)).catch()
			.then(() => void queue.shift());

		queue.push(promise);
	};
})();


//
//	Manage global counts of tabs.
//
// Responsibilities:
//	* Restore from storage upon init
//	* Save to storage on change
//	* Keep counts of: opened/closed/delta since session start
//	* Keep track of time of last change, and
//		* Reset self when that time is longer than RESET_AFTER_HOURS hours
class Tabs {
	async constructor() {
		await this.restore();
	}

	async setTo(last, delta) {
		if (!last) {
			await localSet({start: +new Date});
		}

		const {ts = +new Date, base, opened = 0, closed = 0} = last || {};

		const tabs = await tabsQuery({});

		this.base = base || tabs.length;
		this.ts = ts;
		this.opened = opened;
		this.closed = closed;

		if (delta) {
			await this.changeBy(delta);
		}
	}

	async restore() {
		const {last} = await localGet('last')

		await this.setTo(last);
	}

	get expired() {
		return (+new Date - this.ts) >= (RESET_AFTER_HOURS * HOUR);
	}

	get total() {
		return this.base + this.delta;
	}

	get delta() {
		return this.opened - this.closed;
	}

	// NOTE: Only the sign of `n` matters.
	async changeBy(n) {
		if (this.expired) {
			await appendHistory({
				event: 'reset',
				now: +new Date,
				ts: this.ts,
				result1: (+new Date - this.ts) >= (RESET_AFTER_HOURS * HOUR),
				result2: +new Date - this.ts >= RESET_AFTER_HOURS * HOUR
			});

			await this.setTo(undefined, n)
		}

		if (n === 0) return;
		if (n > 0) this.opened++;
		if (n < 0) this.closed++;

		await this.save();
	}

	async save() {
		// Get prop values from all getters
		const {total, delta, expired} = this;

		// Save after combining "raw props" with all "getter props"
		await localSet({
			...this, // "raw"
			total, delta, expired // "getters"
		});
	}
}

// Update `allTabs` state, and create event to be logged
function change(n) {
	if (n === 0) return () => {};

	return async tab => {
		await allTabs.changeBy(n);

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

		const {start} = await localGet('start');

		if (start) {
			o.session = {
				start,
				duration: o.ts - start,
				ago: fmtDate(start, true)
			};
		}

		appendHistory(o);
	};
}

const allTabs = new Tabs();

chrome.tabs.onCreated.addListener(change(1));
chrome.tabs.onRemoved.addListener(change(-1));

chrome.runtime.onMessage.addListener((data, sender) => appendHistory({sender, data}));

