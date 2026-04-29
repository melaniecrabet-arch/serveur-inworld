const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

app.get('/', (req, res) => {
    res.send('Serveur Cabinet Psychologue actif');
});

app.get('/alain', (req, res) => {
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
    <div id="status">Cliquez pour commencer</div>
    <button onclick="demarrer()">Parler a Monsieur Alain</button>
    <button onclick="arreter()">Terminer la seance</button>
    <script>
        let ws, stream, mediaRecorder, audioCtx;
        const serverWs = location.origin.replace('https', 'wss').replace('http', 'ws') + '/relay';

        async function demarrer() {
            document.getElementById('status').innerText = "Connexion...";
            audioCtx = new AudioContext();
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            ws = new WebSocket(serverWs);
            ws.onopen = () => {
                document.getElementById('status').innerText = "Monsieur Alain vous ecoute...";
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = (e) => {
                    if (ws.readyState === 1) ws.send(e.data);
                };
                mediaRecorder.start(100);
            };
            ws.onmessage = async (e) => {
                if (e.data instanceof Blob) {
                    const arrayBuffer = await e.data.arrayBuffer();
                    try {
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                        const source = audioCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioCtx.destination);
                        source.start();
                    } catch(err) {
                        console.log('Audio non decodable:', err);
                    }
                } else {
                    console.log('Message:', e.data);
                }
            };
            ws.onerror = () => { document.getElementById('status').innerText = "Erreur"; };
            ws.onclose = (e) => { document.getElementById('status').innerText = "Ferme: " + e.reason; };
        }

        function arreter() {
            if (mediaRecorder) mediaRecorder.stop();
            if (ws) ws.close();
            if (stream) stream.getTracks().forEach(t => t.stop());
            document.getElementById('status').innerText = "Seance terminee";
        }
    </script>
</body>
</html>`);
});

wss.on('connection', (clientWs) => {
    const apiKey = process.env.INWORLD_API_KEY;
    const inworldWs = new WebSocket(
        'wss://api.inworld.ai/api/v1/realtime/session?key=voice-' + Date.now() + '&protocol=realtime',
        { headers: { Authorization: 'Basic ' + apiKey } }
    );

    inworldWs.on('open', () => {
        inworldWs.send(JSON.stringify({
            type: 'session.update',
            session: {
                instructions: 'Tu t appelles Alain. Tu es un patient qui consulte une psychologue. Parle uniquement en Francais.',
                output_modalities: ['audio', 'text']
            }
        }));
    });

    clientWs.on('message', (data) => {
        if (inworldWs.readyState === 1) inworldWs.send(data);
    });

    inworldWs.on('message', (data) => {
        if (clientWs.readyState === 1) clientWs.send(data);
    });

    inworldWs.on('close', () => clientWs.close());
    clientWs.on('close', () => inworldWs.close());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Serveur demarre sur le port ' + PORT);
});