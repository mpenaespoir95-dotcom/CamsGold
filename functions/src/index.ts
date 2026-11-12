import { getApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import sharp from 'sharp';

initializeApp();

const accessToken = defineSecret('WHATSAPP_ACCESS_TOKEN');
const phoneNumberId = defineSecret('WHATSAPP_PHONE_NUMBER_ID');
const graphApiVersion = defineString('WHATSAPP_GRAPH_API_VERSION');
const templateName = defineString('WHATSAPP_TEMPLATE_NAME', {
  default: 'gold_purchase_slip',
});
const templateLanguage = defineString('WHATSAPP_TEMPLATE_LANGUAGE', {
  default: 'fr',
});
const recipientPhone = '242068461531';
const allowedRoles = new Set(['ADMIN', 'CASHIER', 'BUYER']);

interface PurchasePayment {
  amount: number;
  paidAt: string;
  method: string;
  note?: string;
  account?: string;
}

interface PurchaseSlip {
  id: string;
  reference: string;
  description: string;
  amount: number;
  purchasedAt: string;
  supplier?: string;
  grossWeightGrams?: number;
  nonGoldWeightGrams?: number;
  netWeightGrams?: number;
  karat?: string;
  goldCategory: string;
  referencePricePerGram?: number;
  payments: PurchasePayment[];
}

const db = getFirestore(getApp(), 'ai-studio-camsgold-aac9e856-fac5-4a8d-a74b-c1a7ca9769a8');

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    };
    return entities[character];
  });

const text = (
  value: unknown,
  x: number,
  y: number,
  options: { size?: number; color?: string; weight?: number; anchor?: string } = {}
): string => {
  const { size = 20, color = '#192A24', weight = 400, anchor = 'start' } = options;
  const content = escapeXml(String(value ?? ''));
  return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${content}</text>`;
};

const formatMoney = (amount: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;

const formatWeight = (weight: number): string =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(weight)} g`;

const formatDate = (date: string): string => {
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? 'Date non disponible'
    : new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeZone: 'Africa/Brazzaville',
      }).format(parsedDate);
};

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

const createPurchaseSlipSvg = (purchase: PurchaseSlip, operatorName: string): string => {
  const grossWeight = purchase.grossWeightGrams ?? purchase.netWeightGrams ?? 0;
  const netWeight = purchase.netWeightGrams ?? grossWeight;
  const fineWeight =
    netWeight * ((Number.parseFloat(purchase.karat ?? '') || 24) / 24);
  const paidAmount = purchase.payments.reduce((total, payment) => total + payment.amount, 0);
  const balance = purchase.amount - paidAmount;
  const paymentRows = purchase.payments.slice(0, 5);
  const height = 1000 + Math.max(0, paymentRows.length - 1) * 62;
  const paymentMarkup =
    paymentRows.length === 0
      ? text('Aucun règlement enregistré', 90, 778, { size: 18, color: '#667085' })
      : paymentRows
          .map((payment, index) => {
            const y = 778 + index * 62;
            return [
              text(payment.method || 'Paiement', 90, y, { size: 18, weight: 700 }),
              text(payment.account || 'Caisse (espèces)', 510, y, {
                size: 16,
                color: '#667085',
              }),
              text(formatMoney(payment.amount), 1110, y, {
                size: 18,
                color: '#008B62',
                weight: 700,
                anchor: 'end',
              }),
              `<line x1="90" y1="${y + 22}" x2="1110" y2="${y + 22}" stroke="#EAECF0"/>`,
            ].join('');
          })
          .join('');
  const paymentBottom = 778 + Math.max(1, paymentRows.length) * 62;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
    <rect width="1200" height="${height}" fill="#ffffff"/>
    <rect x="8" y="8" width="1184" height="${height - 16}" rx="24" fill="#ffffff" stroke="#192A24" stroke-width="4"/>
    ${text('CAMS GOLD COMPTOIR', 64, 82, { size: 34, weight: 800 })}
    ${text("ACHAT · ANALYSE · EXPORTATION D'OR & MÉTAUX PRÉCIEUX", 64, 116, { size: 17, color: '#D39725', weight: 700 })}
    ${text('Bordereau Officiel de Pesée & Règlement au Comptoir', 64, 148, { size: 16, color: '#667085' })}
    <rect x="735" y="48" width="400" height="42" rx="8" fill="#192A24"/>
    ${text(`BON D'ACHAT N° ${purchase.reference}`, 935, 76, { size: 19, color: '#ffffff', weight: 700, anchor: 'middle' })}
    ${text(`Date d'opération : ${formatDate(purchase.purchasedAt)}`, 1135, 120, { size: 16, color: '#475467', anchor: 'end' })}
    ${text(`Opérateur : ${truncate(operatorName, 36)}`, 1135, 148, { size: 16, color: '#475467', anchor: 'end' })}
    <line x1="64" y1="180" x2="1136" y2="180" stroke="#192A24" stroke-width="3"/>

    <rect x="64" y="216" width="1072" height="118" rx="16" fill="#F9FAFB" stroke="#EAECF0" stroke-width="2"/>
    ${text('FOURNISSEUR / VENDEUR', 88, 250, { size: 14, color: '#667085', weight: 700 })}
    ${text(truncate(purchase.supplier || 'Fournisseur inconnu', 48), 88, 286, { size: 24, weight: 700 })}
    ${text("Catégorie d'or :", 88, 316, { size: 17, color: '#475467' })}
    ${text(purchase.goldCategory, 230, 316, { size: 17, color: '#D39725', weight: 700 })}

    <rect x="64" y="370" width="1072" height="56" rx="12" fill="#FAF8F3" stroke="#E8D8BE"/>
    ${text("DÉTAIL DE L'ANALYSE PHYSIQUE & PESÉE CERTIFIÉE", 88, 405, { size: 17, weight: 700 })}
    <rect x="64" y="426" width="1072" height="96" fill="#ffffff" stroke="#EAECF0"/>
    ${text('POIDS BRUT', 88, 462, { size: 13, color: '#667085', weight: 700 })}
    ${text('TARE / DÉCHETS', 264, 462, { size: 13, color: '#667085', weight: 700 })}
    ${text('POIDS NET', 470, 462, { size: 13, color: '#667085', weight: 700 })}
    ${text('TITRE CARAT', 650, 462, { size: 13, color: '#667085', weight: 700 })}
    ${text('POIDS FIN 24K', 824, 462, { size: 13, color: '#667085', weight: 700 })}
    ${text('PRIX NET / G', 1110, 462, { size: 13, color: '#667085', weight: 700, anchor: 'end' })}
    ${text(formatWeight(grossWeight), 88, 500, { size: 17 })}
    ${text(formatWeight(purchase.nonGoldWeightGrams ?? 0), 264, 500, { size: 17, color: '#667085' })}
    ${text(formatWeight(netWeight), 470, 500, { size: 17, weight: 700 })}
    ${text(purchase.karat || '24K', 650, 500, { size: 17, color: '#D39725', weight: 700 })}
    ${text(formatWeight(fineWeight), 824, 500, { size: 17, weight: 700 })}
    ${text(formatMoney(purchase.referencePricePerGram ?? 0), 1110, 500, { size: 17, color: '#008B62', weight: 700, anchor: 'end' })}

    <rect x="64" y="554" width="1072" height="128" rx="16" fill="#F9FAFB" stroke="#EAECF0" stroke-width="2"/>
    ${text("SITUATION DU RÈGLEMENT", 88, 590, { size: 16, color: '#667085', weight: 700 })}
    ${text("MONTANT TOTAL DE L'ACHAT", 88, 624, { size: 14, color: '#667085' })}
    ${text(formatMoney(purchase.amount), 88, 658, { size: 21, weight: 700 })}
    ${text('DÉJÀ RÉGLÉ', 510, 624, { size: 14, color: '#667085' })}
    ${text(formatMoney(paidAmount), 510, 658, { size: 21, weight: 700 })}
    ${text(balance > 0 ? 'RESTE À PAYER' : 'SOLDE', 900, 624, { size: 14, color: '#667085' })}
    ${text(formatMoney(Math.abs(balance)), 900, 658, { size: 21, weight: 700 })}

    ${text('MODALITÉS DE RÈGLEMENT', 88, 734, { size: 16, color: '#667085', weight: 700 })}
    ${paymentMarkup}
    <line x1="64" y1="${paymentBottom + 18}" x2="1136" y2="${paymentBottom + 18}" stroke="#192A24" stroke-width="2"/>
    ${text("CAMS GOLD COMPTOIR · Bordereau officiel d'achat d'or", 64, paymentBottom + 52, { size: 14, color: '#667085' })}
    ${text(`Référence ${purchase.reference}`, 1136, paymentBottom + 52, { size: 14, color: '#667085', anchor: 'end' })}
  </svg>`;
};

const getApiError = async (response: Response): Promise<string> => {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  return payload?.error?.message || `Erreur API WhatsApp (${response.status}).`;
};

export const sendGoldPurchaseSlip = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [accessToken, phoneNumberId],
  },
  async (request) => {
    let stage = 'authentification';
    let purchaseId = 'inconnu';
    try {
      if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Connectez-vous pour envoyer le bordereau.');
      }
      if (request.auth.token.email_verified !== true) {
        throw new HttpsError('permission-denied', 'Le compte doit être vérifié.');
      }

      stage = 'vérification du profil';
      const profileSnapshot = await db.collection('users').doc(request.auth.uid).get();
      const profile = profileSnapshot.data();
      if (
        profileSnapshot.exists !== true ||
        profile?.active !== true ||
        typeof profile.role !== 'string' ||
        !allowedRoles.has(profile.role)
      ) {
        throw new HttpsError('permission-denied', 'Votre compte n’est pas autorisé à envoyer des achats.');
      }

      stage = 'lecture de l’achat';
      const requestedPurchaseId = request.data?.purchaseId;
      if (typeof requestedPurchaseId !== 'string' || !/^purch-[\w-]+$/.test(requestedPurchaseId)) {
        throw new HttpsError('invalid-argument', 'La référence interne de l’achat est invalide.');
      }
      purchaseId = requestedPurchaseId;

      const purchaseRef = db.collection('purchases').doc(purchaseId);
      const purchaseSnapshot = await purchaseRef.get();
      const purchase = purchaseSnapshot.data() as PurchaseSlip | undefined;
      if (
        !purchaseSnapshot.exists ||
        !purchase ||
        purchase.id !== purchaseId ||
        typeof purchase.reference !== 'string' ||
        typeof purchase.amount !== 'number' ||
        !Number.isFinite(purchase.amount) ||
        purchase.amount <= 0 ||
        !Array.isArray(purchase.payments)
      ) {
        throw new HttpsError('failed-precondition', 'L’achat doit être enregistré avant l’envoi du bordereau.');
      }

      stage = 'réservation de l’envoi';
      const deliveryRef = db.collection('whatsapp_purchase_slips').doc(purchase.id);
      const shouldSend = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(deliveryRef);
        if (snapshot.get('status') === 'sent') return false;
        const lastUpdate = Date.parse(snapshot.get('updatedAt') ?? '');
        if (
          snapshot.get('status') === 'sending' &&
          Number.isFinite(lastUpdate) &&
          Date.now() - lastUpdate < 3 * 60 * 1000
        ) {
          throw new HttpsError('aborted', 'L’envoi de ce bordereau est déjà en cours.');
        }
        transaction.set(
          deliveryRef,
          {
            purchaseId: purchase.id,
            reference: purchase.reference,
            recipient: recipientPhone,
            status: 'sending',
            attempts: (snapshot.get('attempts') ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        return true;
      });
      if (!shouldSend) return { sent: true, alreadySent: true };

      try {
      stage = 'génération de l’image du bordereau';
      const version = graphApiVersion.value();
      if (!/^v\d+\.\d+$/.test(version)) {
        throw new Error('WHATSAPP_GRAPH_API_VERSION doit être au format vNN.N.');
      }

      const operatorName =
        typeof profile.name === 'string' && profile.name.trim()
          ? profile.name
          : 'CAMS GOLD';
      const png = await sharp(Buffer.from(createPurchaseSlipSvg(purchase, operatorName)))
        .png()
        .toBuffer();
      const apiUrl = `https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId.value())}`;
      stage = 'envoi de l’image à WhatsApp';
      const mediaForm = new FormData();
      mediaForm.set('messaging_product', 'whatsapp');
      mediaForm.set('type', 'image/png');
      const pngArrayBuffer = new ArrayBuffer(png.byteLength);
      new Uint8Array(pngArrayBuffer).set(png);
      mediaForm.set(
        'file',
        new Blob([pngArrayBuffer], { type: 'image/png' }),
        `bordereau-${purchase.reference}.png`
      );

      const mediaResponse = await fetch(`${apiUrl}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken.value()}` },
        body: mediaForm,
      });
      if (!mediaResponse.ok) throw new Error(await getApiError(mediaResponse));
      const media = (await mediaResponse.json()) as { id?: string };
      if (!media.id) throw new Error('WhatsApp n’a pas renvoyé l’identifiant du bordereau.');

      stage = 'envoi du modèle WhatsApp';
      const messageResponse = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.value()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientPhone,
          type: 'template',
          template: {
            name: templateName.value(),
            language: { code: templateLanguage.value() },
            components: [
              {
                type: 'header',
                parameters: [{ type: 'image', image: { id: media.id } }],
              },
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: purchase.reference },
                  { type: 'text', text: purchase.supplier || 'Fournisseur inconnu' },
                  { type: 'text', text: formatMoney(purchase.amount) },
                ],
              },
            ],
          },
        }),
      });
      if (!messageResponse.ok) throw new Error(await getApiError(messageResponse));
      const message = (await messageResponse.json()) as {
        messages?: Array<{ id?: string }>;
      };

      await deliveryRef.set(
        {
          status: 'sent',
          messageId: message.messages?.[0]?.id ?? null,
          sentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          error: null,
        },
        { merge: true }
      );
      return { sent: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue.';
        logger.error('Échec de l’envoi du bordereau WhatsApp', {
          stage,
          purchaseId,
          error: message,
        });
        await deliveryRef.set(
          {
            status: 'failed',
            error: `${stage}: ${message}`,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        throw new HttpsError('internal', `Échec à l’étape « ${stage} » : ${message}`);
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const message = error instanceof Error ? error.message : 'Erreur inconnue.';
      logger.error('Erreur serveur pendant l’envoi du bordereau WhatsApp', {
        stage,
        purchaseId,
        error: message,
      });
      throw new HttpsError('internal', `Erreur à l’étape « ${stage} » : ${message}`);
    }
  }
);
