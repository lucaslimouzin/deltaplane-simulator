export class Minimap {
    constructor() {
        // Créer le canvas pour la minimap
        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 200;
        
        // Récupérer le conteneur
        this.container = document.getElementById('minimap-container');
        if (!this.container) {
            console.error('Minimap container not found!');
            return;
        }
        
        // Ajouter le canvas au conteneur
        this.container.appendChild(this.canvas);
        
        // Contexte 2D pour le dessin
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.scale = 0.02; // Échelle de la carte (1 unité = 50 unités monde)
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 2; // Rayon du cercle
    }

    updatePlayerPosition(position, rotation) {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dessiner le fond circulaire
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Ajouter les points cardinaux
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Nord (en haut)
        this.ctx.fillText('N', this.centerX, this.centerY - this.radius + 15);
        // Sud (en bas)
        this.ctx.fillText('S', this.centerX, this.centerY + this.radius - 15);
        // Est (à droite)
        this.ctx.fillText('E', this.centerX + this.radius - 15, this.centerY);
        // Ouest (à gauche)
        this.ctx.fillText('W', this.centerX - this.radius + 15, this.centerY);

        // Créer un masque circulaire
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.clip();

        // Dessiner les ballons (représentant les îles)
        if (window.balloons) {
            window.balloons.forEach(balloon => {
                // Calculer la position relative par rapport au joueur
                const worldX = balloon.userData.initialX;
                const worldZ = balloon.userData.initialZ;
                
                const relativeX = (worldX - position.x) * this.scale;
                const relativeZ = (worldZ - position.z) * this.scale;
                
                // Position sur la minimap
                const x = this.centerX + relativeX;
                const y = this.centerY + relativeZ;
                
                // Dessiner un petit cercle rouge pour représenter le ballon
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FF4444';
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            });
        }

        // Dessiner le joueur (triangle)
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-rotation.y);
        
        // Triangle vert pour le joueur
        this.ctx.fillStyle = '#00FF00';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10); // Pointe vers le haut
        this.ctx.lineTo(-6, 6);  // Coin gauche en bas
        this.ctx.lineTo(6, 6);   // Coin droit en bas
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    update() {
        // La mise à jour est déjà faite dans updatePlayerPosition
    }

    dispose() {
        if (this.container && this.canvas) {
            this.container.removeChild(this.canvas);
        }
    }
} 