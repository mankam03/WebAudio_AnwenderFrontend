const express = require("express");
const path = require("path");


// Server konfigurieren
const app = express();
const port = 3000;

// Statisches Verzeichnis für öffentliche Dateien
app.use(express.static(path.join(__dirname, '../..')));

// Index.html laden
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../../index.html"));
});

// Server starten
app.listen(port, () => {
    console.log('Server läuft unter http://localhost:3000');
});
