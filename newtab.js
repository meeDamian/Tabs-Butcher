'use strict';

const modes = ['diff', 'total', 'split', 'fuck'];

const {local} = chrome.storage;

const style = (id, propName, value) => document.getElementById(id).style[propName] = value;
const setProp = (selector, propName, value) => document.querySelector(selector)[propName] = value;
const setContent = (selector, value) => setProp(selector, 'innerHTML', value);
const counter = (id, value) => setContent(`#${id} h1`, value);

function fmtDate(ts, ago = true) {
	if (!ago) {
		return new Date(ts).toLocaleString('sv');
	}

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

function since(start) {
	if (!start) return;

	setContent('#since', fmtDate(start));
	setProp('#since', 'title', fmtDate(start, false));
	style('session-start', 'display', 'block');
}

function fuck() {
	const GIPHY_API_KEY = 'G6LJJDUAk2KaGiBAP1u280ypodWCk8iu';
	const queries = ['zoomies', 'squirrel', 'dogs', 'puppies'];

	const randomQuery = queries[Math.floor(Math.random() * queries.length)];

	fetch(`http://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${randomQuery}`)
		.then(res => res.json())
		.then(({data: {image_url, title}}) => {
			const img = document.querySelector('#fuck-view img');
			img.setAttribute('src', image_url);
			img.setAttribute('title', title);
			img.setAttribute('alt', title);
		});
}

function populate({mode, last, start}) {
	if (mode === 'fuck') return fuck();
	if (mode === 'total') return counter(`${mode}-view`, last.total);

	since(start);

	if (mode === 'diff') {
		const id = `${mode}-view`;
		const {delta} = last;

		counter(id, delta);

		const {classList} = document.getElementById(id);
		classList.remove('good', 'bad');

		if (delta > 10) classList.add('bad');
		if (delta < -10) classList.add('good');
	}

	if (mode === 'split') {
		counter('opened', last.opened);
		counter('closed', last.closed);
	}
}

function refresh() {
	style('session-start', 'display', 'none');

	local.get(['mode', 'last', 'start'], ({mode, last, start}) => {
		if (!mode) {
			local.set({mode: 'split'});
			return;
		}

		populate({mode, last, start});

		modes
			.filter(m => m !== mode)
			.forEach(m => {
				style(m, 'fontWeight', 'normal');
				style(`${m}-view`, 'opacity', '0');
			});

		style(mode, 'fontWeight', 'bold');
		style(`${mode}-view`, 'opacity', '1');
	});
}

// Register mode-changing click-listeners on footer anchors
for (const mode of modes) {
	document.getElementById(mode).addEventListener('click', () => {
		local.set({mode}, refresh);
		return false;
	})
}

chrome.storage.onChanged.addListener(refresh);

refresh();
