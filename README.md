# 🛒 E2 — Portail de Confirmation de Commandes & Scorecard Fournisseur

Application web moderne développée dans le cadre du projet de fin d'études / master, permettant la gestion, la confirmation et l'évaluation des commandes d'achat avec un portail fournisseur sécurisé sans mot de passe (Magic Links).

---

## 🌟 Fonctionnalités Principales

1. **Espace Acheteur (Acheteur Dashboard)** :
   * Création de commandes d'achat avec détails des produits, quantités et dates de livraison prévues.
   * Génération automatique de liens d'accès sécurisés (Magic Links avec expiration).
   * Suivi en temps réel des confirmations de commandes par les fournisseurs.
   * Visualisation et téléchargement des documents déposés par les fournisseurs (Devis, Factures, Bons de livraison).

2. **Portail Fournisseur (Magic Link Portal)** :
   * Accès sécurisé via un token unique sans besoin de création de compte / mot de passe.
   * Validation / Confirmation des lignes de commande.
   * Dépôt et upload de documents justificatifs dans Supabase Storage.

3. **Évaluation et Scorecard Fournisseurs** :
   * Calcul dynamique du taux de confirmation des commandes par fournisseur.
   * Attribution automatique d'un Grade de Performance (Grade A, B ou C).

---

## 🛠️ Tech Stack

* **Frontend / Framework** : Next.js 15 (App Router), TypeScript, Tailwind CSS
* **Backend / Database** : Supabase (PostgreSQL, Supabase Storage, Row Level Security)
* **Déploiement** : Vercel

---

## 🚀 Installation & Lancement en local

1. **Cloner le projet & Installer les dépendances** :
   ```bash
   npm install