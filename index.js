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
        let audioQueue = [];
        let isPlaying = false;
        let nextPlayTime = 0;
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

        function playAudioChunk(base64Audio) {
            try {
                const binary = atob(base64Audio);
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
                
                const startTime = Math.max(audioCtx.currentTime, nextPlayTime);
                src.start(startTime);
                nextPlayTime = startTime + audioBuffer.duration;
            } catch(err) {
                log('Audio err: ' + err.message);
            }
        }

        async function demarrer() {
            document.getElementById('status').innerText = "Connexion...";
            audioCtx = new AudioContext({ sampleRate: 24000 });
            nextPlayTime = 0;
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            ws = new WebSocket(serverWs);

            ws.onopen = () => {
                document.getElementById('status').innerText = "Monsieur Alain vous ecoute...";
                
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        type: 'conversation.item.create',
                        item: {
                            type: 'message',
                            role: 'user',
                            content: [{ type: 'input_text', text: 'Bonjour' }]
                        }
                    }));
                    ws.send(JSON.stringify({ type: 'response.create' }));
                }, 1000);

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
                    if (msg.type === 'response.output_audio.delta' && msg.delta) {
                        playAudioChunk(msg.delta);
                    }
                    if (msg.type === 'response.output_audio_transcript.delta') {
                        log('Alain: ' + msg.delta);
                    }
                    if (msg.type === 'error') {
                        log('Erreur: ' + JSON.stringify(msg.error));
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
          ```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "model": "xai/grok-4-1-fast-non-reasoning-latest",
    "instructions": "Tu t'appelles Alain. Tu es un patient qui consulte une psychologue. Tu dois impérativement parler uniquement en Français. Ton ton hésitant et tu es là car tu te sens très stressé par ton quotidien. Ne sors jamais de ton rôle de patient. IMPORTANT : Tu dois parler lentement. Marque des pauses entre tes phrases. Tu ne dois jamais répondre impulsivement. Si tu as le moindre doute que la psychologue n'a fini de parler, tu reste silencieux.",
    "output_modalities": [
      "audio",
      "text"
    ],
    "audio": {
      "input": {
        "transcription": {
          "model": "assemblyai/u3-rt-pro"
        },
        "turn_detection": {
          "type": "semantic_vad",
          "eagerness": "high",
          "create_response": true,
          "interrupt_response": true
        }
      },
      "output": {
        "model": "inworld-tts-1.5-max",
      }
    },
    "providerData": {
      "stt": {
        "voice_profile": false
      }
    }
  }
}
```

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