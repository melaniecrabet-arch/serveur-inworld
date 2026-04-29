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

Le mer. 29 avr. 2026, 10:49, Melanie <melaniecrabet@gmail.com> a écrit :
init python:
    import webbrowser

    def ouvrir_session_alain():
        webbrowser.open("https://serveur-inworld.onrender.com/alain")

label start:
    scene bg black
    "Lundi matin. 8h30."
    "Vous arrivez a votre cabinet."
    "=== Vos rendez-vous du jour ==="
    "9h00 - Monsieur Alain (seance 1)"
    "Vous appelez Monsieur Alain."
    jump patient_alain

label patient_alain:
    "Monsieur Alain entre dans votre bureau."
    $ ouvrir_session_alain()
    "Une fenetre s'est ouverte. Parlez a Monsieur Alain."
    jump fin_seance

label fin_seance:
    "Fin de seance."
    return