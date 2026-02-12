# 🚀 Guide de Déploiement Vercel - Option 2 (Tout Gratuit)

## 🎯 **Architecture Finale**

- **Frontend + API Routes** : Vercel (gratuit)
- **Scraping Service** : Render (gratuit)
- **Base de données** : Supabase PostgreSQL (gratuit)

## 📋 **Prérequis**

- Compte GitHub ✅
- Compte Vercel (gratuit)
- Compte Render (gratuit)
- Compte Supabase (gratuit)

## 🗄️ **Étape 1 : Configuration Base de Données**

### **Créer une base Supabase**

1. Aller sur [supabase.com](https://supabase.com)
2. "New Project" → Choisir nom/mot de passe
3. Dans Settings > Database → Copier la **Connection String**
4. Format : `postgresql://postgres:[password]@[host]:5432/postgres`

## 🚀 **Étape 2 : Déploiement Frontend sur Vercel**

### **1. Importer le projet**

- Aller sur [vercel.com](https://vercel.com)
- "New Project" → Sélectionner repository `HandballStats`
- **Root Directory** : `handball-stats` ⚠️ Important !

### **2. Variables d'environnement Vercel**

```env
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe (Paiements)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Scraping (voir étape 3)
SCRAPING_WEBHOOK_URL=https://your-scraper.onrender.com/scrape
WEBHOOK_AUTH_SECRET=your-secret-key-123
```

### **3. Déployer**

- Cliquer "Deploy" → Vercel build automatiquement

## 🔧 **Étape 3 : Déploiement Service Scraping sur Render**

### **1. Créer le service**

- Aller sur [render.com](https://render.com)
- "New" → "Web Service"
- Connecter GitHub → Repository `HandballStats`

### **2. Configuration**

```yaml
Name: handball-scraper
Root Directory: backend
Build Command: pip install -r requirements_scraper.txt
Start Command: python scraper_service.py
```

### **3. Variables d'environnement Render**

```env
WEBHOOK_AUTH_SECRET=your-secret-key-123
PORT=8000
```

### **4. Récupérer l'URL**

- Après déploiement → Copier l'URL (ex: `https://handball-scraper.onrender.com`)
- L'ajouter dans Vercel comme `SCRAPING_WEBHOOK_URL`

## 🔄 **Étape 4 : Test du Système**

### **Flow de scraping :**

1. User clique "Scraper" → Vercel API Route
2. Vercel → Webhook vers Render
3. Render → Scraping en background
4. Render → Callback vers Vercel avec résultats
5. Vercel → Mise à jour base de données

## ✅ **URLs finales**

- **Application** : `https://your-app.vercel.app`
- **Scraper** : `https://your-scraper.onrender.com`
- **Base** : Supabase hébergée

## 💰 **Coûts : 0€**

- Vercel : 100GB/mois gratuit
- Render : 750h/mois gratuit (24/7 = 720h)
- Supabase : 500MB gratuit
