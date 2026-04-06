
// Configurare backend URL (Render)
const API_BASE = window.location.origin; // același server

let wakeupInterval = null;
let countdown = 60;
let serverReady = false;

const loadingScreen = document.getElementById('loading-screen');
const mainApp = document.getElementById('main-app');
const timerDiv = document.getElementById('timer');
const retryBtn = document.getElementById('retryBtn');

// Funcție de verificare health
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        if (response.ok) {
            // Server activ
            if (!serverReady) {
                serverReady = true;
                clearInterval(wakeupInterval);
                loadingScreen.style.display = 'none';
                mainApp.style.display = 'block';
                // Încarcă inițial lista de piese (opțional)
                await loadAllPiese();
            }
            return true;
        }
    } catch (err) {
        // Server încă inactiv
    }
    return false;
}

// Funcție care pornește cronometrul și polling
function startWakeup() {
    let secondsLeft = countdown;
    timerDiv.innerText = secondsLeft;
    serverReady = false;

    // Încercare imediată
    checkHealth().then(ready => {
        if (ready) return;
        // Dacă nu e gata, pornim intervalul
        wakeupInterval = setInterval(async () => {
            secondsLeft--;
            timerDiv.innerText = secondsLeft;
            if (secondsLeft <= 0) {
                // Timpul a expirat
                clearInterval(wakeupInterval);
                timerDiv.innerText = "0";
                retryBtn.style.display = 'block';
                return;
            }
            const isReady = await checkHealth();
            if (isReady) {
                clearInterval(wakeupInterval);
            }
        }, 1000);
    });
}

// Buton reîncercare
retryBtn.addEventListener('click', () => {
    retryBtn.style.display = 'none';
    countdown = 60;
    timerDiv.innerText = countdown;
    startWakeup();
});

// Pornim procesul
startWakeup();

// --- Funcționalitate căutare ---
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

async function loadAllPiese() {
    // opțional: poți afișa toate piesele la început
    const res = await fetch(`${API_BASE}/api/piese`);
    const data = await res.json();
    if (data.length === 0) {
        resultsDiv.innerHTML = '<p>Nu există piese încă.</p>';
    } else {
        let html = '<ul>';
        data.forEach(p => {
            html += `<li><strong>${escapeHtml(p.nume)}</strong>: ${escapeHtml(p.detalii)}</li>`;
        });
        html += '</ul>';
        resultsDiv.innerHTML = html;
    }
}

async function searchPiese() {
    const query = searchInput.value.trim();
    if (!query) {
        resultsDiv.innerHTML = '<p>Introdu un termen de căutare.</p>';
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/cauta?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.length === 0) {
            resultsDiv.innerHTML = '<p>❌ Nu s-a găsit nicio piesă.</p>';
        } else {
            let html = '<ul>';
            data.forEach(p => {
                html += `<li><strong>${escapeHtml(p.nume)}</strong>: ${escapeHtml(p.detalii)}</li>`;
            });
            html += '</ul>';
            resultsDiv.innerHTML = html;
        }
    } catch (err) {
        resultsDiv.innerHTML = '<p>Eroare la căutare. Încearcă din nou.</p>';
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

searchBtn.addEventListener('click', searchPiese);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchPiese();
});
