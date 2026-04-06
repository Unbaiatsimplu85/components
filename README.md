# ComponentDB 🗄️

Aplicație web pentru gestionarea și căutarea componentelor.

## 📁 Structura proiectului

```
componentdb/
├── index.html   ← HTML + configurare (editează secțiunea CONFIG)
├── style.css    ← Toate stilurile
├── app.js       ← Toată logica JavaScript
└── README.md    ← Acest fișier
```

> ⚠️ **Nu ai nevoie de npm, node sau build.**
> Deschide direct `index.html` în browser sau urcă folderul pe Netlify.

---

## ⚙️ Configurare (editează index.html)

Deschide `index.html` și completează secțiunea CONFIG:

```js
const RENDER_URL = "https://NUMELE-TAU.onrender.com";

const FIREBASE_CONFIG = {
  apiKey:            "...",
  authDomain:        "proiect.firebaseapp.com",
  projectId:         "proiect",
  storageBucket:     "proiect.appspot.com",
  messagingSenderId: "...",
  appId:             "..."
};

const MONGO_CONFIG = {
  appId:      "data-xxxxx",
  apiKey:     "...",
  dataSource: "Cluster0",
  database:   "componentdb",
  collection: "components"
};

const ADMIN_EMAIL = "emailul-tau@domeniu.com";
```

---

## 🔧 Servicii necesare (toate gratuite)

### 1. MongoDB Atlas
1. https://cloud.mongodb.com → Create Free Cluster (M0)
2. App Services → Create Application
3. HTTPS Endpoints → Enable Data API
4. Authentication → API Keys → Create key (readWrite)

### 2. Firebase
1. https://console.firebase.google.com → Add Project
2. Authentication → Sign-in method → Email/Password → Enable
3. Authentication → Users → Add user (emailul tău de admin)
4. Project Settings → Your apps → Add Web App → copiază config

### 3. Render (backend)
Adaugă în serverul tău Express:
```js
app.get('/health', (req, res) => res.sendStatus(200));
```

---

## 🚀 Hostuit gratuit

**Netlify** (cel mai simplu):
1. https://netlify.com
2. Drag & drop folderul `componentdb/`
3. Gata — primești URL gratuit

**GitHub Pages**:
1. Creează repo → urcă fișierele
2. Settings → Pages → Deploy from branch → main
