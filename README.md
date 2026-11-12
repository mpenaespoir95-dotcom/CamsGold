# CAMS GOLD

Application web React (TypeScript + Vite + Tailwind CSS) de gestion intégrale de CAMS GOLD : or, devises, trésorerie bancaire et partenariats commerciaux.

## Fonctionnalités

1. **Tableau de Bord & Cotations en Direct** :
   - Indicateurs financiers en temps réel : Caisse, Bénéfice total, Stock de devises, Or en stock.
   - Taux et cours de l'or spot international (Once USD, gramme 24K en FCFA, parité USD/XAF et EUR/XAF).
   - Validation rapide des écritures au journal.

2. **Caisse & Opérations de Trésorerie** :
   - Saisie et calcul des achats d'or brut, fondu et bijoux avec pureté, déduction par catégorie et formule officielle comptoir.
   - Suivi des règlements immédiats et soldes dus avec bordereau imprimable.
   - Virements inter-comptes bancaires et débits de dépenses d'exploitation.

3. **Ventes Dubaï (Export)** :
   - Calcul de rentabilité export : poids, carat, prix USD/g, parité USD/XAF, coûts d'achat, frais de mission et douanes.
   - Contrôle strict du stock disponible par carat et catégorie avant validation.

4. **Échanges de Devises & Historique des Taux** :
   - Convertisseur multi-devises (USD, EUR, XAF, XOF, AED, CNY) avec taux officiel ou parallèle (surcote %).
   - Calcul de commission comptoir et mise à jour automatique des stocks de devises physiques.
   - Graphique interactif d'évolution historique des parités (24h, 7j, 30j, 1 an).

5. **Partenariats & Avances Remboursables** :
   - Contrats de partenariat multi-scénarios (Financement d'achats, apport en or, fonte et transformation, apporteur d'affaires).
   - Contrôle des analyses avant/après fonte avec calcul automatique de la perte au feu.
   - Registre des prêts accordés ou reçus avec historique des remboursements et solde restant.

6. **Banques & Versements** :
   - Vue consolidée de la trésorerie globale.
   - Gestion des comptes bancaires (Ecobank, UBA, Orabank, Caisse espèces, etc.) et relevé d'écritures.

7. **Clients & Fournisseurs** :
   - Répertoire complet avec identifiant unique (CLI-0000x), statuts, rôles multiples et coordonnées.

8. **Rendez-vous & Communication SMS** :
   - Agenda des rendez-vous clients.
   - Module d'envoi SMS intégrant automatiquement les cotations du jour et modèles prédéfinis.

9. **Gestion des Stocks & Rapports** :
   - Suivi par carat (24K, 22K, 21K, 18K, 14K, 9K) et catégorie (Or brut, Bijoux, Or fondu).
   - Registre d'audit des ajustements de métaux précieux et devises.
   - Rapports d'activité consolidés avec format d'impression officiel.

## Démarrage rapide

```bash
npm install
npm run dev
```

Dev server accessible sur le port 3000.

## Authentification et sécurité Firebase

L’application utilise Firebase Authentication avec e-mail/mot de passe. Activez le fournisseur **E-mail/Mot de passe** dans Firebase Authentication et déployez [firestore.rules](./firestore.rules) sur la base de données Firestore dont l’identifiant est défini dans `firebase-applet-config.json` avant de rendre l’application accessible. Avec Firebase CLI connecté au projet, utilisez `firebase deploy --only firestore:rules`.

Les inscriptions créent un compte Firebase et une demande dans `pending_users/{uid}`. L’adresse e-mail doit être vérifiée et un administrateur doit approuver le compte. Pour activer un utilisateur dans la console Firestore, créez `users/{uid}` avec les champs suivants :

```json
{
  "name": "Nom de l’utilisateur",
  "email": "utilisateur@example.com",
  "role": "CASHIER",
  "active": true
}
```

Utilisez l’UID de l’utilisateur Firebase comme identifiant du document. Rôles acceptés : `ADMIN`, `CASHIER`, `BUYER`, `SALES`, `AUDITOR`. Le rôle choisi lors de l’inscription est seulement une demande ; seul le profil `users/{uid}` fait foi. Le premier profil `ADMIN` doit être créé dans la console Firebase, car aucun compte client n’est autorisé à se promouvoir administrateur.

La configuration Firebase utilisée par le navigateur n’est pas un secret. La sécurité des données dépend de l’authentification, des profils approuvés et des règles Firestore ; ne publiez pas l’application tant que les règles ci-dessus ne sont pas déployées sur la bonne base.