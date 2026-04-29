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
body { background:#1a1a2e; color:white; font-family:Arial; text-align:center; padding:40px;}
button { padding:15px 30px; font-size:18px; margin:10px;}
#log { max-width:800px; margin:20px auto; text-align:left;}
</style>
</head>
<body>

<h1>Cabinet Psychologue</h1>
<button onclick="demarrer()">Parler</button>
<button onclick="stop()">Stop</button>

<div id="log"></div>

<script>
let ws, audioCtx, stream, processor, source;
let nextPlayTime = 0;

function log(msg){
document.getElementById("log").innerHTML += "<p>"+msg+"</p>";
}

function floatTo16BitPCM(float32Array){
const buffer = new ArrayBuffer(float32Array.length * 2);
const view = new DataView(buffer);
for (let i=0;i<float32Array.length;i++){
const s=Math.max(-1,Math.min(1,float32Array[i]));
view.setInt16(i*2,s<0?s*0x8000:s*0x7FFF,true);
}
return buffer;
}

function playAudio(base64){
const binary=atob(base64);
const bytes=new Uint8Array(binary.length);
for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);

const int16=new Int16Array(bytes.buffer);
const float32=new Float32Array(int16.length);
for(let i=0;i<int16.length;i++) float32[i]=int16[i]/32768;

const buffer=audioCtx.createBuffer(1,float32.length,24000);
buffer.copyToChannel(float32,0);

const src=audioCtx.createBufferSource();
src.buffer=buffer;
src.connect(audioCtx.destination);

const start=Math.max(audioCtx.currentTime,nextPlayTime);
src.start(start);
nextPlayTime=start+buffer.duration;
}

async function demarrer(){
audioCtx=new AudioContext({sampleRate:24000});
stream=await navigator.mediaDevices.getUserMedia({audio:true});

ws=new WebSocket(location.origin.replace('https','wss').replace('http','ws')+'/relay');

ws.onopen=()=>{
log("Connecté");

ws.send(JSON.stringify({
type:"conversation.item.create",
item:{
type:"message",
role:"user",
content:[{type:"input_text",text:"Bonjour"}]
}
}));

ws.send(JSON.stringify({type:"response.create"}));

source=audioCtx.createMediaStreamSource(stream);
processor=audioCtx.createScriptProcessor(4096,1,1);

source.connect(processor);
processor.connect(audioCtx.destination);

processor.onaudioprocess=(e)=>{
if(ws.readyState===1){
const pcm=floatTo16BitPCM(e.inputBuffer.getChannelData(0));
const b64=btoa(String.fromCharCode(...new Uint8Array(pcm)));

ws.send(JSON.stringify({
type:"input_audio_buffer.append",
audio:b64
}));
}
};
};

ws.onmessage=(e)=>{
const msg=JSON.parse(e.data);

if(msg.type==="response.output_audio.delta"){
playAudio(msg.delta);
}

if(msg.type==="response.output_audio_transcript.delta"){
log("Alain: "+msg.delta);
}
};

ws.onclose=(e)=> log("Fermé "+e.code);
}

function stop(){
if(ws) ws.close();
if(stream) stream.getTracks().forEach(t=>t.stop());
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

    inworldWs.on('open', () => {
        console.log("✅ Connecté à Inworld");

        inworldWs.send(JSON.stringify({
            type: "session.update",
            session: {
                type: "realtime",
                model: "xai/grok-4-1-fast-non-reasoning-latest",
                instructions: "Tu t'appelles Alain. Tu es un patient stressé. Tu parles lentement en français.",
                output_modalities: ["audio", "text"],
                audio: {
                    input: {
                        transcription: {
                            model: "assemblyai/u3-rt-pro"
                        }
                    },
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

    inworldWs.on('close', (code) => {
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