require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const admin = require('firebase-admin');

// Inițializare Firebase Admin SDK
const serviceAccount = require('./firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());
// Servim fișierele statice din folderul "frontend" (vom copia acolo HTML/CSS/JS)
app.use(express.static('public'))
// app.use(express.static('frontend'));

// Conexiune MongoDB
let db;
const client = new MongoClient(process.env.MONGODB_URI);
async function connectDB() {
  await client.connect();
  db = client.db(); // baza de date implicită din connection string
  console.log('✅ MongoDB conectat');
}
connectDB();

// Middleware pentru verificare token admin
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token lipsă' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalid' });
  }
}

// ========== RUTE API ==========

// 1. Obține toate piesele (public - pentru a le afișa utilizatorului după ce serverul e treaz)
app.get('/api/piese', async (req, res) => {
  try {
    const piese = await db.collection('piese').find().toArray();
    res.json(piese);
  } catch (err) {
    res.status(500).json({ error: 'Eroare internă' });
  }
});

// 2. Căutare piesă (substring, case-insensitive) - public
app.get('/api/cauta', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim() === '') {
    return res.json([]);
  }
  // Escape caractere speciale regex
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');
  const results = await db.collection('piese')
    .find({ nume: { $regex: regex } })
    .toArray();
  res.json(results);
});

// 3. Admin - adaugă piesă
app.post('/api/admin/piese', verifyToken, async (req, res) => {
  const { nume, detalii } = req.body;
  if (!nume || !detalii) {
    return res.status(400).json({ error: 'Nume și detalii obligatorii' });
  }
  const result = await db.collection('piese').insertOne({ nume, detalii });
  res.json({ success: true, id: result.insertedId });
});

// 4. Admin - editează piesă
app.put('/api/admin/piese/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { nume, detalii } = req.body;
  if (!nume || !detalii) {
    return res.status(400).json({ error: 'Nume și detalii obligatorii' });
  }
  await db.collection('piese').updateOne(
    { _id: new ObjectId(id) },
    { $set: { nume, detalii } }
  );
  res.json({ success: true });
});

// 5. Admin - șterge piesă
app.delete('/api/admin/piese/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  await db.collection('piese').deleteOne({ _id: new ObjectId(id) });
  res.json({ success: true });
});

// 6. Endpoint simplu de health check (pentru cronometru)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server rulând pe portul ${PORT}`);
});