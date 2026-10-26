tu vois si on peut utuliser aiven pour crer une db et conmmencer le tockage laba apres je vais migrer vers un vp
# GastroLink BF — API Backend (V1)

API backend de la plateforme de mise en relation gastronomique et de livraison
au Burkina Faso. Sert les 4 applications : Client, Établissement, Livreur (mobile,
Flutter) et Administrateur (web, Flutter Web).

## Installation sur votre serveur (Ubuntu/Debian)

Ces étapes suivent celles déjà données pour la préparation du serveur
(MySQL installé, base `gastrolink_bf` créée, script `GastroLinkBF_Structure_BDD.sql`
déjà importé).

```bash
cd gastrolink-api
npm install
cp .env.example .env
# Éditez .env : renseignez DB_PASSWORD et générez un JWT_SECRET (commande fournie dans le fichier)
npm start
```

Le serveur démarre par défaut sur le port 3000. Vérifiez avec :
```bash
curl http://localhost:3000/health
# → {"status":"ok","service":"gastrolink-api"}
```

En développement, `npm run dev` relance automatiquement le serveur à chaque
modification de fichier (utilise `node --watch`, aucune dépendance supplémentaire).

## Déploiement sur Vercel avec MySQL Aiven

Définissez `gastrolink-api` comme répertoire racine du projet Vercel. L'API
REST est servie par `api/[...path].js` ; le point d'entrée Socket.IO est
`/api/socket-io/socket.io`. Vercel prend en charge les WebSockets, mais les
rooms Socket.IO en mémoire ne sont pas partagées entre instances. De plus, les
émissions de messages depuis l'API REST ne sont pas relayées au point d'entrée
Socket.IO distinct. Le temps réel inter-utilisateurs n'est donc pas garanti ;
les routes REST, dont l'envoi et la lecture des messages, restent disponibles.

Dans les variables d'environnement Vercel, configurez `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD` et `DB_NAME` avec les valeurs du service Aiven. Ajoutez
également :

```text
DB_SSL=true
DB_SSL_CA=<contenu du certificat CA Aiven>
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=<secret aléatoire long>
```

Ne déployez jamais le fichier `.env` ou le certificat local `ca.pem` : ils sont
exclus par `.vercelignore`. Les valeurs Aiven doivent être configurées uniquement
comme variables d'environnement dans Vercel. L'endpoint de santé est
`/api/health` sur Vercel (`/health` reste disponible en local).

## ⚠️ Ce qui a été réellement testé, et ce qui ne l'a pas été

Le code a été écrit dans un environnement sans accès réseau (ni `npm install`,
ni serveur MySQL disponible). Pour rester honnête sur le niveau de confiance :

**Testé automatiquement et exécuté avec succès (30/30 tests passent, `npm test`) :**
- Hachage et vérification des mots de passe (`src/utils/password.js`)
- Génération et vérification des tokens JWT (`src/utils/jwt.js`)
- Machine à états des statuts de commande, y compris les restrictions par rôle
  (`src/services/commandeStatus.js`)
- Calcul des commissions (`src/services/commissionService.js`)
- Règle d'exclusivité des avis établissement/livreur (`src/services/avisService.js`)

**Vérifié uniquement syntaxiquement (`node --check`, aucune erreur), mais PAS
exécuté avec une vraie base de données ni de vrais appels HTTP :**
- Tous les contrôleurs (`src/controllers/*.js`)
- Toutes les routes (`src/routes/*.js`)
- La configuration Socket.io (`src/sockets/index.js`)
- Le fichier serveur principal (`src/server.js`)

**Recommandation avant mise en production** : testez manuellement chaque route
avec Postman, Insomnia ou `curl` une fois le serveur connecté à votre vraie base
de données, en suivant les scénarios de la section « Parcours à tester en
priorité » ci-dessous.

## Périmètre couvert en V1

- Authentification des 4 rôles (inscription client/établissement/livreur, connexion commune)
- Gestion du menu (produits) par l'établissement, y compris bascule de disponibilité
- Cycle de vie complet de la commande : création, acceptation/refus par l'établissement,
  prise en charge par le livreur, transitions de statut jusqu'à la livraison,
  génération automatique de la commission
- Messagerie interne (REST + diffusion temps réel via Socket.io)
- Avis clients (avec la règle d'exclusivité établissement/livreur)
- Validation des comptes établissement/livreur par l'administrateur
- Suspension/réactivation de comptes
- Tableau de bord administrateur (chiffres clés)
- Signalement et résolution de litiges

## Explicitement hors périmètre V1 (voir dossier de conception, section 2.7)

- Paiement mobile money / carte bancaire réel (seul « espèces à la livraison »
  est fonctionnel ; la table PAIEMENT existe mais n'est pas encore branchée à un
  contrôleur dédié)
- Notifications push réelles (Firebase Cloud Messaging) — la table NOTIFICATION
  existe mais n'est pas encore peuplée automatiquement par le code
- Taux de commission spécifique par établissement (le wireframe admin le montre,
  mais le schéma SQL V1 ne porte qu'un taux global via `COMMISSION_TAUX_DEFAUT`
  dans `.env` — ajouter une colonne `taux_commission` à la table `etablissement`
  pour l'activer)
- Historisation systématique de la position du livreur dans `POSITION_LIVREUR`
  (le temps réel fonctionne via Socket.io, mais l'écriture en base à intervalles
  réguliers reste à implémenter, par exemple toutes les 30 secondes côté client Flutter)

## Parcours à tester en priorité une fois déployé

1. `POST /api/auth/inscription/client` puis `POST /api/auth/connexion` (role: "client")
2. `POST /api/auth/inscription/etablissement`, puis validation via
   `POST /api/admin/etablissements/:id/valider` (avec un compte admin créé
   manuellement en base au préalable — il n'y a pas d'inscription publique admin,
   volontairement, cf. action 15 du dossier de conception)
3. `POST /api/produits` (établissement) pour ajouter un plat au menu
4. `POST /api/commandes` (client) avec une ligne sur ce produit
5. `POST /api/commandes/:id/accepter-etablissement` avec `temps_preparation_estime`
6. `POST /api/auth/inscription/livreur` + validation admin, puis
   `POST /api/commandes/:id/accepter-livreur` avec `temps_livraison_estime`
7. `POST /api/commandes/:id/valider` (client)
8. `PATCH /api/commandes/:id/statut` en enchaînant `en_preparation → prete → recuperee → en_livraison → livree`
   (chaque appel avec le token du rôle autorisé pour cette transition précise)
9. Vérifier qu'une ligne apparaît automatiquement dans la table `commission`
10. `POST /api/avis` (client, une fois la commande livrée)

## Créer le premier compte administrateur

Il n'y a volontairement aucune route d'inscription publique pour les
administrateurs (cohérent avec le dossier de conception). Le tout premier
compte doit être inséré directement en base :

```sql
-- Générez d'abord le hash avec :
-- node -e "console.log(require('./src/utils/password').hashPassword('votre_mot_de_passe'))"
INSERT INTO administrateur (nom, prenom, email, mot_de_passe, role)
VALUES ('Ouédraogo', 'Aïssata', 'admin@gastrolinkbf.bf', 'COLLEZ_LE_HASH_ICI', 'super_admin');
```
