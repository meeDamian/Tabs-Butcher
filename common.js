'use strict';

const promisify = (fn, bind) => arg => new Promise(resolve => fn.bind(bind)(arg, resolve));

const {local} = chrome.storage;

const localGet = promisify(local.get.bind(local));
const localSet = promisify(local.set.bind(local));

const fetchJson = url => fetch(url).then(r => r.json());

const MODES = Object.freeze({
	a: 'total',
	s: 'split',
	d: 'diff',
	f: 'fuck'
});

async function nextMode(skipSplit) {
	const {mode} = await localGet('mode');
	const modes = Object.values(MODES);

	let idx = modes.indexOf(mode) + 1;
	if (skipSplit && idx === modes.indexOf('split')) {
		idx++;
	}

	await localSet({mode: modes[idx % modes.length]});
}

// Takes timestamp ts, returns it formatted as ex: "2020-12-31 23:59:59"
const fmtTsSane = ts => new Date(ts).toLocaleString('sv');

// Takes timestamp ts, returns it formatted as ex: "29 minutes ago"
function fmtTsAgo(ts) {
	const UNITS = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
	const SEC_ARRAY = [60, 60, 24, 7, 365 / 7 / 12, 12];

	let diff = (+new Date - ts) / 1000;
	let idx = 0;

	for (; diff >= SEC_ARRAY[idx] && idx < SEC_ARRAY.length; idx++) {
		diff /= SEC_ARRAY[idx];
	}

	diff = Math.floor(diff);
	idx *= 2;
	if (diff > (idx === 0 ? 9 : 1)) idx += 1;

	if (idx === 0) return 'just now';
	let unit = UNITS[Math.floor(idx / 2)];
	if (diff > 1) unit += 's';
	return `${diff} ${unit} ago`;
}

