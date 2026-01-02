#!/bin/bash

###############################################################################
# Installeur Backend Comptabilité France - macOS
# Installation minimale : Node.js + Backend NestJS + SQLite vierge
###############################################################################

set -e  # Arrêter en cas d'erreur

INSTALL_DIR="$HOME/Library/Application Support/ComptabiliteFrance"
DATA_DIR="$HOME/Documents/ComptabiliteFrance"
LOG_FILE="$HOME/Library/Logs/ComptabiliteFrance/install.log"
BACKEND_URL="https://pub-9e3d86a4776244b2a9dbc8478170a03f.r2.dev/backend.zip"

# Créer les dossiers de logs
mkdir -p "$(dirname "$LOG_FILE")"

echo "=====================================" | tee -a "$LOG_FILE"
echo "Installation Comptabilité France" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 1. Vérifier/Installer Node.js
echo "Étape 1/5 : Vérification de Node.js..." | tee -a "$LOG_FILE"
if ! command -v node &> /dev/null; then
    echo "Node.js non trouvé. Installation via Homebrew..." | tee -a "$LOG_FILE"

    # Installer Homebrew si nécessaire
    if ! command -v brew &> /dev/null; then
        echo "Installation de Homebrew..." | tee -a "$LOG_FILE"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi

    # Installer Node.js
    brew install node
    echo "✓ Node.js installé" | tee -a "$LOG_FILE"
else
    NODE_VERSION=$(node -v)
    echo "✓ Node.js déjà installé : $NODE_VERSION" | tee -a "$LOG_FILE"
fi

# 2. Créer les dossiers
echo "" | tee -a "$LOG_FILE"
echo "Étape 2/5 : Création des dossiers..." | tee -a "$LOG_FILE"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
echo "✓ Dossiers créés" | tee -a "$LOG_FILE"

# 3. Télécharger et extraire le backend
echo "" | tee -a "$LOG_FILE"
echo "Étape 3/5 : Téléchargement du backend..." | tee -a "$LOG_FILE"
cd "$INSTALL_DIR"

# Copier le backend depuis le répertoire local (pour développement)
# En production, télécharger depuis GitHub Releases
if [ -d "/Users/alainnataf/Dropbox/LOGICIEL COMPTA/comptabilite-france/backend/dist" ]; then
    echo "Mode développement : copie du backend local" | tee -a "$LOG_FILE"
    cp -r "/Users/alainnataf/Dropbox/LOGICIEL COMPTA/comptabilite-france/backend/dist" "$INSTALL_DIR/backend"
    cp -r "/Users/alainnataf/Dropbox/LOGICIEL COMPTA/comptabilite-france/backend/node_modules" "$INSTALL_DIR/node_modules"
    cp "/Users/alainnataf/Dropbox/LOGICIEL COMPTA/comptabilite-france/backend/package.json" "$INSTALL_DIR/package.json"
else
    echo "Téléchargement depuis GitHub..." | tee -a "$LOG_FILE"
    curl -L -o backend.zip "$BACKEND_URL"
    unzip -q backend.zip
    rm backend.zip
fi

echo "✓ Backend installé" | tee -a "$LOG_FILE"

# 4. Créer la base SQLite vierge et les dossiers de travail
echo "" | tee -a "$LOG_FILE"
echo "Étape 4/5 : Création de la base de données SQLite..." | tee -a "$LOG_FILE"
touch "$DATA_DIR/database.sqlite"
mkdir -p "$DATA_DIR/exports"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/scripts"
mkdir -p "$DATA_DIR/backups"
echo "✓ Base de données créée : $DATA_DIR/database.sqlite" | tee -a "$LOG_FILE"
echo "✓ Dossiers de travail créés" | tee -a "$LOG_FILE"

# 5. Créer le LaunchAgent pour démarrage automatique
echo "" | tee -a "$LOG_FILE"
echo "Étape 5/5 : Configuration du démarrage automatique..." | tee -a "$LOG_FILE"

PLIST_FILE="$HOME/Library/LaunchAgents/com.comptabilite.france.backend.plist"

NODE_PATH=$(which node)

cat > "$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.comptabilite.france.backend</string>

    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/backend/main.js</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>PORT</key>
        <string>3001</string>
        <key>DB_PATH</key>
        <string>$DATA_DIR/database.sqlite</string>
        <key>CLOUD_API_URL</key>
        <string>https://violent-karon-gestion3008-free-e7089456.koyeb.app/api</string>
        <key>EXPORTS_DIR</key>
        <string>$DATA_DIR/exports</string>
        <key>UPLOADS_DIR</key>
        <string>$DATA_DIR/uploads</string>
        <key>SCRIPTS_DIR</key>
        <string>$DATA_DIR/scripts</string>
        <key>BACKUPS_DIR</key>
        <string>$DATA_DIR/backups</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/ComptabiliteFrance/backend.log</string>

    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/ComptabiliteFrance/backend-error.log</string>
</dict>
</plist>
EOF

# Charger le LaunchAgent
launchctl unload "$PLIST_FILE" 2>/dev/null || true
launchctl load "$PLIST_FILE"

echo "✓ Démarrage automatique configuré" | tee -a "$LOG_FILE"

# Attendre que le backend démarre
echo "" | tee -a "$LOG_FILE"
echo "Démarrage du backend..." | tee -a "$LOG_FILE"
sleep 3

# Vérifier que le backend fonctionne
if curl -s http://localhost:3001/api > /dev/null; then
    echo "✓ Backend démarré avec succès" | tee -a "$LOG_FILE"
else
    echo "⚠ Le backend met du temps à démarrer. Vérifiez les logs dans quelques secondes." | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "✓ Installation terminée avec succès !" | tee -a "$LOG_FILE"
echo "=====================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Le backend tourne maintenant sur http://localhost:3001" | tee -a "$LOG_FILE"
echo "Rendez-vous sur https://gestion3008.vercel.app pour utiliser l'application" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Logs disponibles dans : $HOME/Library/Logs/ComptabiliteFrance/" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
