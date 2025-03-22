export class Minimap {
    constructor() {
        // Créer le canvas pour la minimap
        this.canvas = document.createElement('canvas');
        
        // Récupérer le conteneur
        this.container = document.getElementById('minimap-container');
        if (!this.container) {
            console.error('Minimap container not found!');
            return;
        }
        
        // Ajouter le canvas au conteneur
        this.container.appendChild(this.canvas);
        
        // Ajuster la taille du canvas à celle du conteneur
        this.resizeCanvas();
        
        // Ajouter un listener pour le redimensionnement
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Contexte 2D pour le dessin
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.scale = 0.02; // Échelle de la carte (1 unité = 50 unités monde)
        this.updateDimensions();
    }

    resizeCanvas() {
        // Obtenir la taille réelle du conteneur
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.updateDimensions();
    }

    updateDimensions() {
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.radius = Math.min(this.canvas.width, this.canvas.height) / 2 - 2;
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
        this.ctx.lineWidth = Math.max(1, this.canvas.width / 100);
        this.ctx.stroke();

        // Créer un masque circulaire pour les éléments de jeu
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
                
                // Calculer la taille du point en fonction de la taille du canvas
                const pointSize = Math.max(2, this.canvas.width / 30);
                
                // Dessiner un petit cercle rouge pour représenter le ballon
                this.ctx.beginPath();
                this.ctx.arc(x, y, pointSize, 0, Math.PI * 2);
                this.ctx.fillStyle = '#FF4444';
                this.ctx.fill();
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = Math.max(0.5, pointSize / 4);
                this.ctx.stroke();
            });
        }

        // Dessiner le joueur (triangle)
        this.ctx.translate(this.centerX, this.centerY);
        this.ctx.rotate(-rotation.y);
        
        // Calculer la taille du triangle en fonction de la taille du canvas
        const triangleSize = Math.max(4, this.canvas.width / 15);
        
        // Triangle vert pour le joueur
        this.ctx.fillStyle = '#00FF00';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -triangleSize);
        this.ctx.lineTo(-triangleSize * 0.6, triangleSize * 0.6);
        this.ctx.lineTo(triangleSize * 0.6, triangleSize * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();

        // Dessiner les points cardinaux par-dessus tout le reste
        const fontSize = Math.max(8, Math.floor(this.canvas.width / 15));
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = Math.max(1, fontSize / 4);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const padding = Math.max(8, this.radius / 10);
        
        // Dessiner le texte avec contour
        const drawCardinalPoint = (text, x, y) => {
            this.ctx.strokeText(text, x, y);
            this.ctx.fillText(text, x, y);
        };

        // Nord (en haut)
        drawCardinalPoint('N', this.centerX, this.centerY - this.radius + padding);
        // Sud (en bas)
        drawCardinalPoint('S', this.centerX, this.centerY + this.radius - padding);
        // Est (à droite)
        drawCardinalPoint('E', this.centerX + this.radius - padding, this.centerY);
        // Ouest (à gauche)
        drawCardinalPoint('W', this.centerX - this.radius + padding, this.centerY);
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