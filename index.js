const inworldWs = new WebSocket(
  'wss://api.inworld.ai/v1/realtime?protocol=realtime',
  { headers: { Authorization: 'Basic ' + apiKey } }
);

// ✅ logs (EN DEHORS du JSON)
inworldWs.on('open', () => {
  console.log("✅ Connecté à Inworld");

  // ✅ envoie la session UNE FOIS connecté
  inworldWs.send(JSON.stringify({
    type: "session.update",
    session: {
      type: "realtime",
      model: "xai/grok-4-1-fast-non-reasoning-latest",
      instructions: "Tu t'appelles Alain. Tu es un patient qui consulte une psychologue. Tu dois impérativement parler uniquement en Français. Ton ton hésitant et tu es là car tu te sens très stressé par ton quotidien. Ne sors jamais de ton rôle de patient. IMPORTANT : Tu dois parler lentement. Marque des pauses entre tes phrases. Tu ne dois jamais répondre impulsivement. Si tu as le moindre doute que la psychologue n'a fini de parler, tu reste silencieux.",
      output_modalities: ["audio", "text"],
      audio: {
        input: {
          transcription: {
            model: "assemblyai/u3-rt-pro"
          },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "high",
            create_response: true,
            interrupt_response: true
          }
        },
        output: {
          model: "inworld-tts-1.5-max"
        }
      },
      providerData: {
        stt: {
          voice_profile: false
        }
      }
    }
  }));
});

inworldWs.on('close', (code, reason) => {
  console.log("❌ Fermé:", code, reason.toString());
});

inworldWs.on('error', (err) => {
  console.log("❌ Erreur:", err.message);
});