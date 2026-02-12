FROM node:20-alpine

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances avec --legacy-peer-deps
RUN npm ci --legacy-peer-deps

# Copier le reste des fichiers
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Exposer le port
EXPOSE 3000

# Commande par défaut
CMD ["npm", "run", "dev"]
