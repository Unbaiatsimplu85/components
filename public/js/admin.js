import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Înlocuiește cu datele tale din Firebase (configurația web)
const firebaseConfig = {
  apiKey: "AIzaSyBw1IvxNIbBQ1DAFOqM-lowwZuzN4Fvjkw",
  authDomain: "smd-components-67a54.firebaseapp.com",
  projectId: "smd-components-67a54",
  storageBucket: "smd-components-67a54.firebasestorage.app",
  messagingSenderId: "112939372508",
  appId: "1:112939372508:web:fc83a7d9499661a7bf8919",
  measurementId: "G-RWW9RYJV7V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elemente DOM
const authSection = document.getElementById('auth-section');
const adminPanel = document.getElementById('admin-panel');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authError = document.getElementById('auth-error');
const piesaNume = document.getElementById('piesaNume');
const piesaDetalii = document.getElementById('piesaDetalii');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');
const messageDiv = document.getElementById('message');
const editIdSpan = document.getElementById('editId');
const pieseList = document.getElementById('piese-list');

let currentEditId = null;

async function getToken() {
    const user = auth.currentUser;
    if (!user) throw new Error('Neautentificat');
    return await user.getIdToken();
}

// Încarcă toate piesele și le afișează
async function loadPiese() {
    try {
        const token = await getToken();
        const res = await fetch('/api/piese'); // endpoint public, dar îl putem folosi
        const piese = await res.json();
        pieseList.innerHTML = '';
        for (let p of piese) {
            const li = document.createElement('li');
            li.innerHTML = `
                <div><strong>${escapeHtml(p.nume)}</strong>: ${escapeHtml(p.detalii)}</div>
                <div>
                    <button class="edit-btn" data-id="${p._id}" data-nume="${escapeHtml(p.nume)}" data-detalii="${escapeHtml(p.detalii)}">Editează</button>
                    <button class="delete-btn" data-id="${p._id}">Șterge</button>
                </div>
            `;
            pieseList.appendChild(li);
        }
        // Evenimente pentru butoanele dinamice
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentEditId = btn.dataset.id;
                piesaNume.value = btn.dataset.nume;
                piesaDetalii.value = btn.dataset.detalii;
                addBtn.textContent = 'Salvează modificările';
                editIdSpan.style.display = 'inline';
                editIdSpan.innerText = `Editezi ID: ${currentEditId}`;
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Ștergi această piesă?')) {
                    const id = btn.dataset.id;
                    const token = await getToken();
                    await fetch(`/api/admin/piese/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    messageDiv.innerText = 'Piesă ștearsă';
                    setTimeout(() => messageDiv.innerText = '', 2000);
                    loadPiese();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}

// Adăugare sau editare
addBtn.addEventListener('click', async () => {
    const nume = piesaNume.value.trim();
    const detalii = piesaDetalii.value.trim();
    if (!nume || !detalii) {
        messageDiv.innerText = 'Completează ambele câmpuri';
        return;
    }
    const token = await getToken();
    if (currentEditId) {
        // Editare
        await fetch(`/api/admin/piese/${currentEditId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nume, detalii })
        });
        messageDiv.innerText = 'Piesă actualizată';
        currentEditId = null;
        addBtn.textContent = 'Adaugă';
        editIdSpan.style.display = 'none';
    } else {
        // Adăugare
        await fetch('/api/admin/piese', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ nume, detalii })
        });
        messageDiv.innerText = 'Piesă adăugată';
    }
    piesaNume.value = '';
    piesaDetalii.value = '';
    setTimeout(() => messageDiv.innerText = '', 2000);
    loadPiese();
});

// Renunță
cancelBtn.addEventListener('click', () => {
    piesaNume.value = '';
    piesaDetalii.value = '';
    currentEditId = null;
    addBtn.textContent = 'Adaugă';
    editIdSpan.style.display = 'none';
});

// Login
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
        authError.innerText = '';
    } catch (err) {
        authError.innerText = 'Email sau parolă greșită';
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        authSection.style.display = 'none';
        adminPanel.style.display = 'block';
        loadPiese();
    } else {
        authSection.style.display = 'block';
        adminPanel.style.display = 'none';
    }
});

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
