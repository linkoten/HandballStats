# 🚀 Guide de Déploiement Vercel

## 📋 Prérequis
- Compte GitHub (✅ fait)
- Compte Vercel (gratuit)
- Base de données PostgreSQL en ligne (Supabase, Railway, etc.)

## 🎯 Étapes de Déploiement

### 1️⃣ **Créer un compte Vercel**
- Aller sur [vercel.com](https://vercel.com)
- Se connecter avec GitHub

### 2️⃣ **Importer le projet**
- Cliquer sur "New Project"
- Sélectionner votre repository `HandballStats`
- Choisir le dossier `handball-stats` comme root directory

### 3️⃣ **Configuration des variables d'environnement**

Dans les Settings > Environment Variables de Vercel :

```env
# Base de données
DATABASE_URL=postgresql://user:password@host:port/database

# Clerk (Auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe (Paiements)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4️⃣ **Déployer**
- Cliquer sur "Deploy"
- Vercel build automatiquement votre Next.js

## 🔧 **Backend Python - Options**

### Option A : Railway (Recommandé)
1. Aller sur [railway.app](https://railway.app)
2. Connecter GitHub 
3. Déployer le dossier `backend/`
4. Railway gérera automatiquement le `requirements.txt`

### Option B : Render
1. Aller sur [render.com](https://render.com)
2. Créer un Web Service
3. Connecter le repository
4. Root Directory: `backend`
5. Build Command: `pip install -r requirements.txt`
6. Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

## 🔄 **Configuration CORS Backend**

Mettre à jour `backend/api/main.py` :

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",  # Remplacer par votre URL Vercel
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ✅ **URLs finales**
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app` ou `https://your-backend.onrender.com`