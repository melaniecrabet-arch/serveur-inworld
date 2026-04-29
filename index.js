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
        #log { text-align: left; max-width: 800px; margin: 20px auto; font-size: 14px; color: #aaa; }
    </style>
</head>
<body>
    <h1>Cabinet Psychologue</h1>
    <h2>Seance avec Monsieur Alain</h2>
    <div id="status">Cliquez pour commencer</div>
    <button onclick="demarrer()">Parler a Monsieur Alain</button>
    <button onclick="arreter()">Terminer la seance</button>
    <div id="log"></div>
    <script>
        let ws, stream, audioCtx, processor, source;
        const serverWs = location.origin.replace('https', 'wss').replace('http', 'ws') + '/relay';

        function log(msg) {
            document.getElementById('log').innerHTML += '<p>' + msg + '</p>';
        }

        function floatTo16BitPCM(float32Array) {
            const buffer = new ArrayBuffer(float32Array.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < float32Array.length; i++) {
                const s = Math.max(-1, Math.min(1, float32Array[i]));
                view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
            return buffer;
        }

        async function demarrer() {
            document.getElementById('status').innerText = "Connexion...";
            audioCtx = new AudioContext({ sampleRate: 24000 });
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            ws = new WebSocket(serverWs);

            ws.onopen = () => {
                document.getElementById('status').innerText = "Monsieur Alain vous ecoute...";
                source = audioCtx.createMediaStreamSource(stream);
                processor = audioCtx.createScriptProcessor(4096, 1, 1);
                source.connect(processor);
                processor.connect(audioCtx.destination);
                processor.onaudioprocess = (e) => {
                    if (ws.readyState === 1) {
                        const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
                        const b64 = btoa(String.fromCharCode(...new Uint8Array(pcm)));
                        ws.send(JSON.stringify({
                            type: 'input_audio_buffer.append',
                            audio: b64
                        }));
                    }
                };
            };

            ws.onmessage = async (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === 'response.audio.delta' && msg.delta) {
                        const binary = atob(msg.delta);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                        const int16 = new Int16Array(bytes.buffer);
                        const float32 = new Float32Array(int16.length);
                        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
                        const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
                        audioBuffer.copyToChannel(float32, 0);
                        const src = audioCtx.createBufferSource();
                        src.buffer = audioBuffer;
                        src.connect(audioCtx.destination);
                        src.start();
                    }
                    if (msg.type === 'response.output_text.delta') {
                        log('Alain: ' + msg.delta);
                    }
                    if (msg.type === 'error') {
                        log('Erreur: ' + JSON.stringify(msg));
                    }
                } catch(err) {
                    log('Parse err: ' + err.message);
                }
            };

            ws.onerror = () => { document.getElementById('status').innerText = "Erreur connexion"; };
            ws.onclose = (e) => { document.getElementById('status').innerText = "Ferme: " + e.code; };
        }

        function arreter() {
            if (processor) processor.disconnect();
            if (source) source.disconnect();
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
                instructions: 'Tu t appelles Alain. Tu es un patient qui consulte une psychologue. Parle uniquement en Francais. Tu es stresse et hesitant.',
                output_modalities: ['audio', 'text'],
                audio: {
                    input: {
                        format: 'pcm16',
                        sample_rate: 24000,
                        turn_detection: { type: 'semantic_vad' }
                    },
                    output: {
                        format: 'pcm16',
                        sample_rate: 24000
                    }
                }
            }
        }));
    });

    clientWs.on('message', (data) => {
        if (inworldWs.readyState === 1) inworldWs.send(data.toString());
    });

    inworldWs.on('message', (data) => {
        if (clientWs.readyState === 1) clientWs.send(data.toString());
    });

    inworldWs.on('close', (code, reason) => clientWs.close(code, reason));
    inworldWs.on('error', (err) => clientWs.close(1011, err.message));
    clientWs.on('close', () => inworldWs.close());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Serveur demarre sur le port ' + PORT);
});