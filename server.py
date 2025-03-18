import http.server
import socketserver
import os
import socket

# Configuration du port
PORT = 8000

# Répertoire contenant les fichiers statiques
DIRECTORY = "public"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Ajouter des en-têtes CORS pour permettre les requêtes cross-origin
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def run_server():
    # Utiliser "0.0.0.0" au lieu de "" pour écouter sur toutes les interfaces réseau
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serveur démarré sur le port {PORT}")
        print(f"Ouvrez votre navigateur à l'adresse: http://localhost:{PORT}")
        print(f"Pour accéder depuis d'autres ordinateurs du réseau local, utilisez l'adresse IP de cet ordinateur")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServeur arrêté.")

if __name__ == "__main__":
    # Vérifier si le répertoire public existe
    if not os.path.exists(DIRECTORY):
        print(f"Erreur: Le répertoire '{DIRECTORY}' n'existe pas.")
        exit(1)
    
    # Vérifier si le fichier bundle.js existe
    if not os.path.exists(os.path.join(DIRECTORY, "js", "bundle.js")):
        print("Attention: Le fichier 'bundle.js' n'existe pas.")
        print("Exécutez 'npm run build' pour générer le bundle.")
    
    run_server() 