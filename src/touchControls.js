import * as THREE from 'three';

export class TouchControls {
    constructor(deltaplane) {
        this.deltaplane = deltaplane;
        this.touchZones = {};
        this.createTouchInterface();
        this.setupEventListeners();
    }

    createTouchInterface() {
        // Container for touch controls
        const container = document.createElement('div');
        container.id = 'touch-controls';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            padding: 20px;
            pointer-events: none;
            z-index: 1000;
        `;

        // Left control zone
        const leftZone = document.createElement('div');
        leftZone.className = 'touch-zone left';
        leftZone.style.cssText = `
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 60px;
            pointer-events: auto;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            color: white;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        `;
        leftZone.innerHTML = '←';
        this.touchZones.left = leftZone;

        // Right control zone
        const rightZone = document.createElement('div');
        rightZone.className = 'touch-zone right';
        rightZone.style.cssText = leftZone.style.cssText;
        rightZone.innerHTML = '→';
        this.touchZones.right = rightZone;

        // Add elements to container
        container.appendChild(leftZone);
        container.appendChild(rightZone);
        document.body.appendChild(container);

        // Add meta viewport tag for mobile
        if (!document.querySelector('meta[name="viewport"]')) {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
            document.head.appendChild(meta);
        }
    }

    setupEventListeners() {
        // Touch events for control zones
        this.touchZones.left.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.deltaplane.setControl('rollLeft', true);
        });
        this.touchZones.left.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.deltaplane.setControl('rollLeft', false);
        });
        this.touchZones.right.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.deltaplane.setControl('rollRight', true);
        });
        this.touchZones.right.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.deltaplane.setControl('rollRight', false);
        });

        // Prevent context menu on touch zones
        this.touchZones.left.addEventListener('contextmenu', (e) => e.preventDefault());
        this.touchZones.right.addEventListener('contextmenu', (e) => e.preventDefault());

        // Prevent default touch behaviors
        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    // Call this method to check if the device is mobile
    static isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
} 