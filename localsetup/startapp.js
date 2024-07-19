const express = require("express");
const path = require("path");


// configure server
const app = express();
const port = 3000;

// location of files
app.use(express.static(path.join(__dirname, '../')));

// load index.html under route /
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// start server
app.listen(port, () => {
    console.log('Anwendung läuft unter http://localhost:3000');
});
