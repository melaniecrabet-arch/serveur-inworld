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

app.get('/alain', async (req, res) => {
    const apiKey = process.env.INWORLD_API_KEY;
    
    try {
        const response = await fetch('https://api.inworld.ai/v1/realtime/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ttl: 3600 })
        });
        
        const data = await response.json();
        const token = data.token || apiKey;
        
        res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Seance avec Monsieur Alain</title>
    <style>
        body { background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #c8a882; }
        button { background: #8B2020; color: white; border: none; padding: 20px 40px; font-size: 20px; border-radius: 10px; cursor: pointer; margin: 20px; }
        #status { margin: 20px; font-size: 18px; color: #c8a882; }
    </style>
</head>
<body>
    <h1>Cabinet Psychologue</h1>
    <h2>Seance avec Monsieur Alain</h2>
    <div id="status">Cliquez sur le bouton pour commencer</div>
    <button onclick="demarrer()">Parler a Monsieur Alain</button>
    <button onclick="arreter()">Terminer la seance</button>
    <script>
        const TOKEN = "${token}";
        let ws, mediaRecorder, audioContext, stream;

        async function demarrer() {
            document.getElementById('status').innerText = "Connexion en cours...";
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const wsUrl = "wss://api.inworld.ai/api/v1/realtime/session?token=" + TOKEN + "&protocol=realtime";
                ws = new WebSocket(wsUrl);
                ws.onopen = () => { 
                    document.getElementById('status').innerText = "Monsieur Alain vous ecoute...";
                };
                ws.onmessage = (e) => { console.log(e.data); };
                ws.onerror = (e) => { 
                    document.getElementById('status').innerText = "Erreur: " + JSON.stringify(e);
                };
                ws.onclose = (e) => {
                    document.getElementById('status').innerText = "Connexion fermee: " + e.code + " " + e.reason;
                };
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
    } catch(e) {
        res.status(500).send('Erreur: ' + e.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Serveur demarre sur le port ' + PORT);
});