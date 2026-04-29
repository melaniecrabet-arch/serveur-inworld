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
</head>
<body>
    <h1>Cabinet Psychologue</h1>
    <button onclick="demarrer()">Parler</button>

<script>
let ws;

function demarrer() {
    ws = new WebSocket(location.origin.replace('https','wss').replace('http','ws') + '/relay');

    ws.onopen = () => {
        console.log("connecté serveur");

        ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: 'Bonjour' }]
            }
        }));

        ws.send(JSON.stringify({ type: 'response.create' }));
    };

    ws.onmessage = (e) => {
        console.log("msg:", e.data);
    };

    ws.onclose = (e) => {
        console.log("fermé:", e.code);
    };
}
</script>
</body>
</html>`);
});

wss.on('connection', (clientWs) => {
    const apiKey = process.env.INWORLD_API_KEY;

    const inworldWs = new WebSocket(
        'wss://api.inworld.ai/v1/realtime?protocol=realtime',
        { headers: { Authorization: 'Basic ' + apiKey } }
    );

    // ✅ connexion ouverte
    inworldWs.on('open', () => {
        console.log("✅ Connecté à Inworld");

        // ✅ envoi config UNE FOIS connecté
        inworldWs.send(JSON.stringify({
            type: "session.update",
            session: {
                type: "realtime",
                model: "xai/grok-4-1-fast-non-reasoning-latest",
                instructions: "Tu t'appelles Alain. Tu es un patient stressé. Tu parles lentement en français.",
                output_modalities: ["audio", "text"],
                audio: {
                    output: {
                        model: "inworld-tts-1.5-max"
                    }
                }
            }
        }));
    });

    inworldWs.on('message', (data) => {
        if (clientWs.readyState === 1) {
            clientWs.send(data.toString());
        }
    });

    inworldWs.on('close', (code, reason) => {
        console.log("❌ Fermé:", code);
        clientWs.close(code);
    });

    inworldWs.on('error', (err) => {
        console.log("❌ Erreur:", err.message);
        clientWs.close(1011);
    });

    clientWs.on('message', (data) => {
        if (inworldWs.readyState === 1) {
            inworldWs.send(data.toString());
        }
    });

    clientWs.on('close', () => {
        inworldWs.close();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Serveur démarré sur le port ' + PORT);
});