const BOARD_URL = 'https://coopavola.eggsnext.cloud/main/functions/app/eggs-lavagna/lavagna';

// La lavagna è protetta da login e non espone dati leggibili da questa PWA statica.
// Quando sarà disponibile un export/API ufficiale, compilare questo array con dati reali.
const COMMESSE = [];

const home = document.getElementById('home');
const boardPanel = document.getElementById('boardPanel');
const iframeWrap = document.getElementById('iframeWrap');
const frameNotice = document.getElementById('frameNotice');
const loader = document.getElementById('loader');
const openBoardButton = document.getElementById('openBoard');
const backHomeButton = document.getElementById('backHome');
const openBrowserButton = document.getElementById('openBrowser');
const lookupForm = document.getElementById('lookupForm');
const jobSelect = document.getElementById('jobSelect');
const workDate = document.getElementById('workDate');
const teamResult = document.getElementById('teamResult');

let fallbackTimer;

function openInBrowser() {
  window.open(BOARD_URL, '_blank', 'noopener,noreferrer');
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(`${dateValue}T00:00:00`));
}

function setTodayAsDefaultDate() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  workDate.value = new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function populateCommesse() {
  jobSelect.replaceChildren();

  if (COMMESSE.length === 0) {
    jobSelect.append(new Option('Seleziona commessa', '', true, true));
    jobSelect.append(new Option('Collega prima i dati della lavagna', 'no-data'));
    jobSelect.disabled = false;
    return;
  }

  jobSelect.disabled = false;
  jobSelect.append(new Option('Seleziona una commessa', '', true, true));
  COMMESSE.forEach(commessa => {
    jobSelect.append(new Option(commessa.nome, commessa.id));
  });
}

function findTeam(commessaId, dateValue) {
  const commessa = COMMESSE.find(item => item.id === commessaId);
  return commessa?.squadre?.[dateValue] || null;
}

function renderTeamResult(event) {
  event.preventDefault();
  const commessaId = jobSelect.value;
  const dateValue = workDate.value;

  teamResult.hidden = false;

  if (COMMESSE.length === 0) {
    teamResult.innerHTML = `
      <h2>Dati commesse non collegati</h2>
      <p>Non posso mostrare automaticamente tutte le commesse perché la lavagna richiede login e questa PWA statica non può leggere dati protetti o salvare credenziali.</p>
      <p>Per mostrare qui la squadra senza aprire tutta la lavagna serve un export/API ufficiale della lavagna oppure un backend autenticato.</p>
      <button class="secondary-button" type="button" data-open-browser>Apri la lavagna per il login</button>
    `;
    return;
  }

  const team = findTeam(commessaId, dateValue);
  const selectedJob = jobSelect.options[jobSelect.selectedIndex]?.text || 'Commessa';

  if (!team) {
    teamResult.innerHTML = `
      <h2>Nessuna squadra trovata</h2>
      <p>Per <strong>${selectedJob}</strong> del <strong>${formatDate(dateValue)}</strong> non è presente una squadra nei dati disponibili.</p>
    `;
    return;
  }

  teamResult.innerHTML = `
    <h2>Squadra</h2>
    <p><strong>${selectedJob}</strong> · ${formatDate(dateValue)}</p>
    <ul>${team.map(person => `<li>${person}</li>`).join('')}</ul>
  `;
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

populateCommesse();
setTodayAsDefaultDate();

lookupForm.addEventListener('submit', renderTeamResult);
teamResult.addEventListener('click', event => {
  if (event.target.matches('[data-open-browser]')) {
    openInBrowser();
  }
});
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
