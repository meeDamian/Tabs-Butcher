'use strict';

const style = (id, propName, value) => document.getElementById(id).style[propName] = value;
const setProp = (selector, prop, value) => document.querySelector(selector)[prop] = value;
const setContent = (selector, value) => setProp(selector, 'innerHTML', value);
const setCounter = (id, value) => setContent(`#${id} h1`, value);

function started(start) {
	if (!start) return;

	setContent('#since', fmtTsAgo(start));
	setProp('#since', 'title', fmtTsSane(start));
	style('session-start', 'display', 'block');
}

// That fn is designed to _fuck_ with your mind a bit
async function modeFuck() {
	// Only ever run this fn once per tab
	const justShow = () => style('fuck-view', 'display', 'block');
	modeFuck = justShow;

	const GIPHY_API_KEY = 'G6LJJDUAk2KaGiBAP1u280ypodWCk8iu';

	const queries = ['zoomies', 'squirrel', 'dogs', 'puppies', 'cute', 'napping', 'seal', 'duckling'];
	const randomQuery = queries[Math.floor(Math.random() * queries.length)];

	const giphyUrl = `http://api.giphy.com/v1/gifs/random?api_key=${GIPHY_API_KEY}&tag=${randomQuery}`;

	const {data: {url, image_mp4_url, title}} = await fetchJson(giphyUrl);

	const vid = document.querySelector('#fuck-view video');
	vid.setAttribute('src', image_mp4_url);
	vid.setAttribute('alt', title);

	document.querySelector('#fuck-view a').setAttribute('href', url);

	justShow();
}

function modeTotal({total}) {
	return setCounter('total-view', total);
}

function modeSplit({opened, closed}, start) {
	started(start);

	setCounter('opened', opened);
	setCounter('closed', closed);
}

function modeDiff({delta}, start) {
	started(start);

	const id = 'diff-view';

	setCounter(id, delta);

	const {classList} = document.getElementById(id);
	classList.remove('good', 'bad');

	if (delta > 10) classList.add('bad');
	if (delta < -10) classList.add('good');
}

async function refresh() {
	// Hide all
	style('session-start', 'display', 'none');
	style('fuck-view', 'display', 'none');
	Object.values(MODES).forEach(m => {
		style(m, 'fontWeight', 'normal');
		style(`${m}-view`, 'opacity', '0');
	});

	// Get new state from storage
	const {mode, last, start} = await localGet(['mode', 'last', 'start']);

	// Populate, or set default mode, if not avail
	switch (mode) {
		case 'fuck': await modeFuck(); break;
		case 'total': modeTotal(last); break;
		case 'split': modeSplit(last, start); break;
		case 'diff': modeDiff(last, start); break;
		default:
			await localSet({mode: 'split'});
			return;
	}

	// Show & bold anchor
	style(mode, 'fontWeight', 'bold');
	style(`${mode}-view`, 'opacity', '1');
}


chrome.storage.onChanged.addListener(refresh);
setTimeout(refresh, 0);


// Above, things that change the page, and REACT TO STORAGE CHANGES
//==========================================================
// Below things that react to user stuff, and SET STORAGE


// Only save to storage, because `refresh()` is called on all storage changes anyway.
function setMode(mode) {
	localSet({mode});
	return false;
}

// Register mode-changing click-listeners on footer anchors
for (const mode of Object.values(MODES)) {
	document.getElementById(mode).addEventListener('click', () => setMode(mode));
}

// Register keypress shortcuts: a, s, d, f
document.addEventListener('keypress', ({keyCode}) => {
	const mode = MODES[String.fromCharCode(keyCode).toLowerCase()];
	return mode ? setMode(mode) : nextMode();
});




