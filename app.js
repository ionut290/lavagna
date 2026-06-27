const BOARD_URL = 'https://coopavola.eggsnext.cloud/main/functions/app/eggs-lavagna/lavagna';

// La lavagna è protetta da login e non espone dati leggibili da questa PWA statica.
// I dati inseriti/aggiornati nell'app vengono salvati automaticamente sul dispositivo.
const STORAGE_KEYS = {
  commesse: 'lavagna-avola-commesse',
  username: 'lavagna-avola-username',
  lastSync: 'lavagna-avola-last-sync'
};
let COMMESSE = [];

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
const loginInfo = document.getElementById('loginInfo');
const loginHelper = document.getElementById('loginHelper');
const savedUsername = document.getElementById('savedUsername');
const loginOfficialButton = document.getElementById('loginOfficial');
const saveTeamForm = document.getElementById('saveTeamForm');
const jobName = document.getElementById('jobName');
const teamDate = document.getElementById('teamDate');
const teamMembers = document.getElementById('teamMembers');
const syncStatus = document.getElementById('syncStatus');

let fallbackTimer;
let autoSyncStarted = false;

function openInBrowser() {
  window.open(BOARD_URL, '_blank', 'noopener,noreferrer');
}


function updateSyncStatus(message, isWarning = false) {
  syncStatus.textContent = message;
  syncStatus.classList.toggle('sync-status--warning', isWarning);
}

function normalizeImportedCommesse(rawData) {
  const rows = Array.isArray(rawData) ? rawData : rawData?.commesse;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows
    .map(item => {
      const nome = (item.nome || item.commessa || item.name || '').toString().trim();
      const squadre = item.squadre || item.teams || {};

      if (!nome || typeof squadre !== 'object' || Array.isArray(squadre)) {
        return null;
      }

      const normalizedTeams = Object.fromEntries(
        Object.entries(squadre)
          .map(([date, members]) => [date, Array.isArray(members) ? members.map(String).filter(Boolean) : parseTeamMembers(String(members || ''))])
          .filter(([, members]) => members.length > 0)
      );

      return { id: item.id || slugify(nome), nome, squadre: normalizedTeams };
    })
    .filter(Boolean);
}

function mergeCommesse(importedCommesse) {
  importedCommesse.forEach(imported => {
    let commessa = COMMESSE.find(item => item.id === imported.id || item.nome.toLowerCase() === imported.nome.toLowerCase());

    if (!commessa) {
      COMMESSE.push(imported);
      return;
    }

    commessa.nome = imported.nome;
    commessa.squadre = { ...commessa.squadre, ...imported.squadre };
  });

  COMMESSE.sort((first, second) => first.nome.localeCompare(second.nome, 'it'));
  saveCommesse();
  populateCommesse();
}

async function autoDownloadBoardData() {
  if (autoSyncStarted) {
    return;
  }

  autoSyncStarted = true;
  updateSyncStatus('Scarico automaticamente i dati disponibili dalla lavagna…');

  try {
    const response = await fetch(BOARD_URL, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json, text/html;q=0.9, */*;q=0.8' }
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    const importedCommesse = normalizeImportedCommesse(payload);

    if (importedCommesse.length === 0) {
      throw new Error('Nessun dato importabile ricevuto dalla lavagna ufficiale.');
    }

    mergeCommesse(importedCommesse);
    const now = new Date().toLocaleString('it-IT');
    localStorage.setItem(STORAGE_KEYS.lastSync, now);
    updateSyncStatus(`Dati scaricati automaticamente: ${importedCommesse.length} commesse aggiornate (${now}).`);
  } catch (error) {
    updateSyncStatus('Download automatico non disponibile: la lavagna ufficiale non espone dati leggibili a questa app. Accedi e aggiorna le commesse qui: resteranno salvate sul dispositivo.', true);
  }
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(`${dateValue}T00:00:00`));
}

function getTodayValue() {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function setTodayAsDefaultDate() {
  const todayValue = getTodayValue();
  workDate.value = todayValue;
  teamDate.value = todayValue;
}


function loadSavedData() {
  try {
    COMMESSE = JSON.parse(localStorage.getItem(STORAGE_KEYS.commesse)) || [];
  } catch {
    COMMESSE = [];
  }

  savedUsername.value = localStorage.getItem(STORAGE_KEYS.username) || '';
  const lastSync = localStorage.getItem(STORAGE_KEYS.lastSync);
  updateSyncStatus(lastSync ? `Ultimo download dati: ${lastSync}` : 'I dati della lavagna vengono scaricati automaticamente quando disponibili.');
}

function saveCommesse() {
  localStorage.setItem(STORAGE_KEYS.commesse, JSON.stringify(COMMESSE));
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `commessa-${Date.now()}`;
}

function parseTeamMembers(value) {
  return value
    .split(/[\n,]+/)
    .map(person => person.trim())
    .filter(Boolean);
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

  if (COMMESSE.length === 0 || commessaId === 'no-data') {
    teamResult.innerHTML = `
      <h2>Nessuna commessa salvata</h2>
      <p>Effettua il login nella lavagna ufficiale dall’app, poi aggiungi qui le commesse e le squadre: verranno salvate automaticamente su questo dispositivo.</p>
      <p>Per importarle automaticamente dalla lavagna serve un'API/export ufficiale o un backend autenticato: la password non viene salvata nel frontend.</p>
      <button class="secondary-button" type="button" data-open-browser>Accedi alla lavagna</button>
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
  autoDownloadBoardData();
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

function saveUsername(event) {
  event.preventDefault();
  localStorage.setItem(STORAGE_KEYS.username, savedUsername.value.trim());
  teamResult.hidden = false;
  teamResult.innerHTML = '<h2>Utente salvato</h2><p>Il nome utente è stato ricordato su questo dispositivo. La password non viene salvata.</p>';
}

function saveTeam(event) {
  event.preventDefault();
  const name = jobName.value.trim();
  const date = teamDate.value;
  const members = parseTeamMembers(teamMembers.value);

  if (!name || !date || members.length === 0) {
    return;
  }

  const id = slugify(name);
  let commessa = COMMESSE.find(item => item.id === id);

  if (!commessa) {
    commessa = { id, nome: name, squadre: {} };
    COMMESSE.push(commessa);
  }

  commessa.nome = name;
  commessa.squadre[date] = members;
  COMMESSE.sort((first, second) => first.nome.localeCompare(second.nome, 'it'));
  saveCommesse();
  populateCommesse();
  jobSelect.value = id;
  workDate.value = date;
  teamResult.hidden = false;
  teamResult.innerHTML = `<h2>Commessa salvata</h2><p><strong>${name}</strong> del <strong>${formatDate(date)}</strong> è stata salvata automaticamente su questo dispositivo.</p>`;
  saveTeamForm.reset();
  teamDate.value = getTodayValue();
}

function goHome() {
  window.clearTimeout(fallbackTimer);
  boardPanel.hidden = true;
  home.hidden = false;
  frameNotice.hidden = true;
  loader.hidden = false;
  iframeWrap.querySelector('iframe')?.remove();
}

loadSavedData();
populateCommesse();
setTodayAsDefaultDate();

lookupForm.addEventListener('submit', renderTeamResult);
loginInfo.addEventListener('click', openBoardInApp);
loginHelper.addEventListener('submit', saveUsername);
loginOfficialButton.addEventListener('click', openBoardInApp);
saveTeamForm.addEventListener('submit', saveTeam);
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
