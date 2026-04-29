const express = require('express');
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/', (req, res) => {
    res.send('Serveur Cabinet Psychologue actif');
});

app.get('/alain', (req, res) => {
    const apiKey = process.env.INWORLD_API_KEY;
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Seance avec Alain</title>
    <style>
        body { background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #c8a882; }
        button { background: #8B2020; color: white; border: none; padding: 20px 40px; font-size: 20px; border-radius: 10px; cursor: pointer; margin: 20px; }
        button:hover { background: #a83030; }
        #status { margin: 20px; font-size: 18px; color: #c8a882; }
    </style>
</head>
<body>
    <h1>Cabinet Psychologue</h1>
    <h2>Seance avec Alain Moreau</h2>
    <div id="status">Cliquez sur le bouton pour commencer</div>
    <button onclick="demarrer()">Parler a Alain</button>
    <button onclick="arreter()">Terminer la seance</button>
    <script>
        const API_KEY = "${apiKey}";
        const WS_URL = "wss://api.inworld.ai/api/v1/realtime/session?key=voice-" + Date.now() + "&protocol=realtime";
        let ws, mediaRecorder, stream;

        async function demarrer() {
            document.getElementById('status').innerText = "Connexion en cours...";
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const WS_URL_AUTH = "wss://api.inworld.ai/api/v1/realtime/session?key=voice-" + Date.now() + "&protocol=realtime&authorization=Basic%20" + API_KEY;
                ws = new WebSocket(WS_URL_AUTH);
                ws.onopen = () => { document.getElementById('status').innerText = "Alain vous ecoute..."; };
                ws.onmessage = (e) => { console.log(e.data); };
                ws.onerror = (e) => { document.getElementById('status').innerText = "Erreur de connexion"; };
            } catch(e) {
                document.getElementById('status').innerText = "Erreur: " + e.message;
            }
        }

        function arreter() {
            if(ws) ws.close();
            if(stream) stream.getTracks().forEach(t => t.stop());
            document.getElementById('status').innerText = "Seance terminee";
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Serveur demarre sur le port ' + PORT);
});