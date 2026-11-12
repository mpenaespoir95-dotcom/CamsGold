# Envoi automatique des bordereaux d'achat sur WhatsApp

La fonction `sendGoldPurchaseSlip` génère le bordereau en image côté serveur et l'envoie au numéro configuré dans la fonction. Le jeton d'accès et l'identifiant du numéro WhatsApp ne sont jamais intégrés à l'application web.

## Préparation WhatsApp Business

1. Configurez l'application Meta avec WhatsApp Cloud API et un numéro Business.
2. Créez et faites approuver un modèle **Utility** en français, nommé `gold_purchase_slip`, avec une image dans l'en-tête et ce corps :
   `Bordereau d’achat d’or {{1}} · Fournisseur : {{2}} · Montant : {{3}}.`
3. Vérifiez que le numéro destinataire a donné son accord pour recevoir ces messages. Les envois initiés par l'entreprise hors de la fenêtre de service de 24 heures doivent utiliser un modèle approuvé.
4. Activez la facturation Firebase (plan Blaze) pour déployer Cloud Functions.

## Configuration et déploiement

Depuis la racine du projet, enregistrez les secrets sans les placer dans le code ou dans le navigateur :

```powershell
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
```

Le CLI demande la valeur de chaque secret de manière interactive. Utilisez le jeton permanent ou système prévu pour le déploiement en production et l'identifiant du numéro Business, pas le numéro du destinataire.

Déployez la fonction :

```powershell
firebase deploy --only functions:sendGoldPurchaseSlip
```

En cas d’erreur d’envoi, consultez les journaux côté serveur :

```powershell
firebase functions:log --only sendGoldPurchaseSlip
```

Au premier déploiement, configurez `WHATSAPP_GRAPH_API_VERSION` avec une version Graph API encore prise en charge par Meta. Les paramètres du modèle ont les valeurs par défaut `gold_purchase_slip` et `fr`; modifiez-les si le modèle approuvé utilise un autre nom ou code de langue.

La fonction utilise la base Firestore nommée `ai-studio-camsgold-aac9e856-fac5-4a8d-a74b-c1a7ca9769a8`. Les envois et erreurs sont consignés dans `whatsapp_purchase_slips`, par identifiant d'achat, pour éviter l'envoi en double.
