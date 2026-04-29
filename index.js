const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

app.get('/', (req, res) => {
    res.send('Serveur Cabinet Psychologue actif');
});

app.get('/session', async (req, res) => {
    try {
        const response = await fetch('https://api.inworld.ai/v1/realtime/session?key=voice-' + Date.now() + '&protocol=realtime', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + process.env.INWORLD_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Serveur demarre sur le port ' + PORT);
});