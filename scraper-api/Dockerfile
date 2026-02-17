# Dockerfile pour Render compatible Selenium + Chromium
FROM python:3.12-slim

# Installer dépendances système
RUN apt-get update && \
    apt-get install -y wget gnupg2 curl unzip \
    chromium chromium-driver && \
    rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY . /app
WORKDIR /app

# Définir la variable d'environnement pour Chromium
ENV CHROME_BIN=/usr/bin/chromium
ENV PATH="/usr/bin/chromium:$PATH"

# Commande de lancement
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
