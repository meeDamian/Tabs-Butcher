'use strict';

const GIPHY_API_KEY = 'G6LJJDUAk2KaGiBAP1u280ypodWCk8iu';

const modes = ['diff', 'total', 'split'];
const views = ['single', 'dual', 'random'];

const titles = {
	change: 'Change in the number of tabs during current session',
	total: 'Total amount of tabs currently opened'
};

const {local} = chrome.storage;

const style = (id, prop, value) => document.getElementById(id).style[prop] = value;
const showView = view => views.map(v => style(v, 'opacity', v === view ? '1' : '0'));
const fmtDate = ts => new Date(ts).toISOString().replace(/[TZ]/g, ' ').trim();

function since(start) {
	if (!start) return;

	document.querySelector('#since').innerHTML = fmtDate(start);
	style('session-start', 'display', 'block');
}

function single(label, number, start) {
	document.querySelector('#single h1').innerHTML = number;
	document.querySelector('#single h2').innerHTML = label;

	document.getElementById('single').title = titles[label];
	since(start);

	showView('single');
}

function dual(opened, closed, start) {
	document.querySelector('#opened h1').innerHTML = opened;
	document.querySelector('#closed h1').innerHTML = closed;
	since(start);

	showView('dual');
}

function fuck() {
	const queries = ['zoomies', 'squirrel', 'dogs', 'puppies'];

	fetch(`http://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${queries[Math.floor(Math.random() * queries.length)]}`)
		.then(res => res.json())
		.then(({data: {image_url, title}}) => {
			const img = document.querySelector('#random img');
			img.setAttribute('src', image_url);
			img.setAttribute('title', title);
			showView('random');
		});
}

function refresh() {
	style('session-start', 'display', 'none');

	local.get(['mode', 'last', 'start'], ({mode, last, start}) => {
		console.log('ddd', mode);

		switch (mode) {
			case 'diff' : single('change', last.delta, start); break;
			case 'total': single('total', last.total);         break;
			case 'split': dual(last.opened, last.closed, start);     break;
			case 'fuck' : fuck(); break;
		}

		for (const href of document.querySelectorAll('#modes a')) {
			href.style.fontWeight = 'normal';
		}

		document.getElementById(mode).style.fontWeight = 'bold';
	});
}

function setMode(mode) {
	local.set({mode});
	refresh();
}

// Restore `mode` from storage, and set it for the current tab
local.get('mode', ({mode = modes[0]}) => setMode(mode));

// Register click-listeners on all mode-changing `<a href`s
for (const mode of [...modes, 'fuck']) {
	document.getElementById(mode).onclick = () => {
		setMode(mode);
		return false;
	};
}

// Refresh content of current tab when it gains focus
const {getCurrent, onActivated, onCreated, onRemoved} = chrome.tabs;
getCurrent(({id}) => {
	onActivated.addListener(({tabId}) => {
		if (id === tabId) {
			refresh();
		}
	});
});

// Update counters in current tab if other tabs open/close
const delayedRefresh = () => setTimeout(refresh, 1e3);
onCreated.addListener(delayedRefresh);
onRemoved.addListener(delayedRefresh);
