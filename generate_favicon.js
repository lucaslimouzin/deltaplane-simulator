const fs = require('fs');
const { createCanvas } = require('canvas');

// Création d'un canvas de 32x32 pixels
const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

// Fond bleu ciel
ctx.fillStyle = '#87CEEB';
ctx.fillRect(0, 0, 32, 32);

// Dessin d'un deltaplane simple (triangle)
ctx.fillStyle = '#00FF00';
ctx.beginPath();
ctx.moveTo(16, 8);  // Sommet
ctx.lineTo(24, 24); // Coin droit
ctx.lineTo(8, 24);  // Coin gauche
ctx.closePath();
ctx.fill();

// Conversion en PNG et sauvegarde
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/favicon.png', buffer);

console.log('Favicon généré avec succès dans public/favicon.png'); 