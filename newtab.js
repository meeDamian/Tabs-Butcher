'use strict';

const modes = ['diff', 'total', 'split', 'fuck'];

const style = (id, propName, value) => document.getElementById(id).style[propName] = value;
const setProp = (selector, propName, value) => document.querySelector(selector)[propName] = value;
const setContent = (selector, value) => setProp(selector, 'innerHTML', value);
const counter = (id, value) => setContent(`#${id} h1`, value);

function since(start) {
	if (!start) return;

	setContent('#since', fmtDate(start));
	setProp('#since', 'title', fmtDate(start, false));
	style('session-start', 'display', 'block');
}

async function fuck() {
	fuck = () => {};

	const GIPHY_API_KEY = 'G6LJJDUAk2KaGiBAP1u280ypodWCk8iu';
	const queries = ['zoomies', 'squirrel', 'dogs', 'puppies', 'cute', 'napping', 'seal', 'duckling'];

	const randomQuery = queries[Math.floor(Math.random() * queries.length)];

	const res = await fetch(`http://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${randomQuery}`);
	const {data: {url, image_mp4_url, title}} = await res.json();

	const vid = document.querySelector('#fuck-view video');
	vid.setAttribute('src', image_mp4_url);
	vid.setAttribute('alt', title);

	document.querySelector('#fuck-view a').setAttribute('href', url);
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

async function refresh() {
	style('session-start', 'display', 'none');

	const {mode, last, start} = await localGet(['mode', 'last', 'start']);

	if (!mode) {
		await localSet({mode: 'split'});
		return false;
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
}

// Register mode-changing click-listeners on footer anchors
for (const mode of modes) {
	document.getElementById(mode).addEventListener('click', () => {
		localSet({mode}).then(refresh);
		return false;
	})
}

chrome.storage.onChanged.addListener(refresh);

setTimeout(refresh, 0);
