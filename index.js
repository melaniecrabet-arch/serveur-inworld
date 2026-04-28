const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Serveur Cabinet Psychologue actif');
});

app.listen(3000, () => {
    console.log('Serveur demarre sur le port 3000');
});