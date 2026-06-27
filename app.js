const BOARD_URL = 'https://coopavola.eggsnext.cloud/main/functions/app/eggs-lavagna/lavagna';

const home = document.getElementById('home');
const boardPanel = document.getElementById('boardPanel');
const iframeWrap = document.getElementById('iframeWrap');
const frameNotice = document.getElementById('frameNotice');
const loader = document.getElementById('loader');
const openBoardButton = document.getElementById('openBoard');
const backHomeButton = document.getElementById('backHome');
const openBrowserButton = document.getElementById('openBrowser');

let fallbackTimer;

function openInBrowser() {
  window.open(BOARD_URL, '_blank', 'noopener,noreferrer');
}

function showFallback() {
  frameNotice.hidden = false;
  loader.hidden = true;
  openInBrowser();
}

function openBoardInApp() {
  home.hidden = true;
  boardPanel.hidden = false;
  frameNotice.hidden = true;
  loader.hidden = false;

  iframeWrap.querySelector('iframe')?.remove();

  const iframe = document.createElement('iframe');
  iframe.title = 'Lavagna Avola';
  iframe.src = BOARD_URL;
  iframe.loading = 'eager';
  iframe.referrerPolicy = 'no-referrer-when-downgrade';
  iframe.allow = 'fullscreen; clipboard-read; clipboard-write';

  iframe.addEventListener('load', () => {
    window.clearTimeout(fallbackTimer);
    loader.hidden = true;
  });

  iframe.addEventListener('error', showFallback);
  iframeWrap.appendChild(iframe);

  fallbackTimer = window.setTimeout(() => {
    if (!loader.hidden) {
      showFallback();
    }
  }, 6000);
}

function goHome() {
  window.clearTimeout(fallbackTimer);
  boardPanel.hidden = true;
  home.hidden = false;
  frameNotice.hidden = true;
  loader.hidden = false;
  iframeWrap.querySelector('iframe')?.remove();
}

openBoardButton.addEventListener('click', openBoardInApp);
backHomeButton.addEventListener('click', goHome);
openBrowserButton.addEventListener('click', event => {
  event.preventDefault();
  openInBrowser();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js');
  });
}
