// Configurare backend URL (același server)
const API_BASE = window.location.origin;

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
            if (!serverReady) {
                serverReady = true;
                clearInterval(wakeupInterval);
                loadingScreen.style.display = 'none';
                mainApp.style.display = 'block';
                // NU mai încărcăm nicio piesă automat
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

    checkHealth().then(ready => {
        if (ready) return;
        wakeupInterval = setInterval(async () => {
            secondsLeft--;
            timerDiv.innerText = secondsLeft;
            if (secondsLeft <= 0) {
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

// --- Funcționalitate căutare (fără afișare inițială) ---
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

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
