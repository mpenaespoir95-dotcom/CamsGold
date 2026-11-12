export type GoldCategory = 'Or brut' | 'Bijoux' | 'Or fondu' | 'Non catégorisé';

export const GOLD_STOCK_CATEGORIES: GoldCategory[] = ['Or brut', 'Bijoux', 'Or fondu', 'Non catégorisé'];

export interface PurchaseFormulaConfig {
  ounceDiscountUsd: number; // T = prix OZ - 30 (défaut: 30)
  troyOunceDivisor: number; // Diviseur d'once troy en grammes (défaut: 31.103477)
  brutDeductionXaf: number; // Décote or brut (défaut: 4500 FCFA/24K)
  brutDiscountPercent: number; // Décote en % pour l'or brut : Or brut = (((L'or brut₁ - 4 500) / 24) × Carat) - 6%
  fonduDeductionXaf: number; // Décote or fondu (défaut: 3500 FCFA/24K)
  bijouxDeductionXaf: number; // Décote bijoux (défaut: 7000 FCFA)
  bijouxFormulaMode: 'deductFromFondu' | 'deductFromBrut1'; // 'deductFromFondu' correspond à la formule manuscrite: fondu - 7000

  // Formule taux parallèle demandée:
  // taux_parallèle = Taux_officiel * (1 + premium/100)
  // premium = ((marché_noir - dollar_international) / dollar_international) * 100
  officialUsdRate: number; // Taux USD/XAF configuré
  blackMarketUsdRate: number; // Taux parallèle configuré
  useParallelRateInPurchases: boolean; // appliquer le taux parallèle dans les achats
  kitcoGoldSpotUsd?: number; // Cours de référence Kitco optionnel manuel/live

  // Formules personnalisables saisies par l'utilisateur
  customFormulaT?: string;
  customFormulaOrBrut1?: string;
  customFormulaOrBrut?: string;
  customFormulaOrFondu?: string;
  customFormulaBijoux?: string;
}

export const DEFAULT_PURCHASE_FORMULA_CONFIG: PurchaseFormulaConfig = {
  ounceDiscountUsd: 30,
  troyOunceDivisor: 31.103477,
  brutDeductionXaf: 4500,
  brutDiscountPercent: 6, // 6% par défaut selon la formule exacte
  fonduDeductionXaf: 3500,
  bijouxDeductionXaf: 7000,
  bijouxFormulaMode: 'deductFromFondu',
  officialUsdRate: 0,
  blackMarketUsdRate: 0,
  useParallelRateInPurchases: false,
  customFormulaT: 'T = Prix OZ ($) - 30 $',
  customFormulaOrBrut1: "L'or brut₁ = (T × Taux USD/XAF) / 31.103477",
  customFormulaOrBrut: "Or brut = (((L'or brut₁ - 4 500) / 24) × Carat) - 6%",
  customFormulaOrFondu: "Or fondu = ((L'or brut₁ - 3 500) / 24) × Carat",
  customFormulaBijoux: 'Bijoux = Or fondu - 7 000 FCFA/g',
};

export type GoldTypology = 'Or brut' | 'Or fondu' | 'Bijoux';

export const SUPPLIER_ROLES = [
  'Fournisseur d’or brut',
  'Fournisseur d’or fondu',
  'Fournisseur de bijoux',
] as const;

export const CLIENT_ROLES = [
  'Client d’or brut',
  'Client d’or fondu',
  'Client de bijoux',
] as const;

export const OTHER_CONTACT_ROLES = [
  'Fournisseur de devises (Change)',
  'Client de devises (Change)',
  'Partenaire investisseur',
] as const;

export interface Contact {
  id?: string;
  reference: string;
  name: string;
  phone: string;
  city: string;
  roles: string[];
  email?: string;
  notes?: string;
  appointment?: string | null;
  bankName?: string;
  bankAccountNumber?: string;
}

export interface ClientTransferDetails {
  fromAccount: string;
  clientName: string;
  clientBank: string;
  clientAccountNumber: string;
  clientBankAgency?: string;
  clientAccountHolder?: string;
  clientBankReference?: string;
  feeAmount?: number;
  reason: string;
}

export interface DepositDenominations {
  b10000?: number;
  b5000?: number;
  b2000?: number;
  b1000?: number;
  b500?: number;
  p500?: number;
  p200?: number;
  p100?: number;
  p50?: number;
  p25?: number;
  p10?: number;
  p5?: number;
  p2?: number;
  p1?: number;
  monnaieRendue?: number;
}

export interface BankDepositDetails {
  fromAccount?: string; // 'Caisse (espèces)'
  sourceAccount?: string; // 'Caisse (espèces)'
  targetBank: string; // ex: 'Crédit du Congo', 'Ecobank', etc.
  bankGroupName?: string; // ex: 'Groupe Attijariwafa bank'
  accountNumber?: string; // N° de compte à créditer
  accountHolder?: string; // Nom / Titulaire du compte (CAMS GOLD COMPTOIR SARL)
  accountAddress?: string; // Adresse du titulaire
  amount?: number;
  amountInWords?: string; // Somme en toutes lettres
  slipNumber?: string;
  depositedBy?: string; // Effectué par M.
  depositorAddress?: string; // Demeurant à
  depositorPhone?: string; // Tél.
  depositorEmail?: string; // E-mail
  orderOf?: string; // D'ordre de
  forAccountOf?: string; // Pour compte de
  provenanceFonds?: string; // Provenance des fonds
  shiftPeriod?: 'Matin' | 'Soir'; // Vacation
  date?: string;
  note?: string;
  denominations?: DepositDenominations;
}

export interface LedgerEntry {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  createdAt?: string; // ISO date string
  weightOz?: number;
  goldSaleDetails?: {
    amountUsd: number;
    ounces: number;
  };
  isIncome?: boolean;
  isTransfer?: boolean; // Approvisionnement / transfert inter-comptes
  isClientTransfer?: boolean; // Virement vers le compte d'un client
  isDeposit?: boolean; // Versement de la caisse à un compte bancaire
  isCashDeposit?: boolean; // Dépôt direct / alimentation de la caisse pour achats
  isCashWithdrawal?: boolean; // Retrait direct d'espèces de la caisse
  depositor?: string;
  beneficiary?: string;
  notes?: string;
  reference?: string;
  account?: string;
  isProcessed?: boolean;
  clientTransferDetails?: ClientTransferDetails;
  depositDetails?: BankDepositDetails;
}

export interface PurchasePayment {
  amount: number;
  paidAt: string;
  method: string;
  note?: string;
  account?: string;
}

export interface PurchaseRecord {
  id: string;
  description: string;
  amount: number;
  purchasedAt: string;
  reference: string;
  supplier?: string;
  grossWeightGrams?: number;
  nonGoldWeightGrams?: number;
  netWeightGrams?: number;
  karat?: string;
  goldCategory: GoldCategory;
  purityPercent?: number;
  referencePricePerGram?: number;
  discountPercent?: number;
  goldPricePerTroyOunceUsd?: number;
  usdToXafRate?: number;
  rateObservedAt?: string;
  payments: PurchasePayment[];
  photos?: string[];
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface SaleBarItem {
  id: string;
  srNo: string; // '001', '002'
  barRef: string;
  barWeight: number; // Poids général / brut en g
  sampleWeight: number; // Poids échantillon en g
  goldPurity: number; // AU % ex: 0.7070
  carat: number; // Carat calculé ex: 16.97 K
  pureWeightGrams: number; // Poids pur 24K ex: 303.176 g
  ounces: number; // Poids pur en onces troy ex: 9.75 oz
}

export interface SaleFixingItem {
  id: string;
  date: string;
  quantityGrams: number;
  ounces: number;
  pricePerOunceUsd: number;
}

export interface SaleAdvancePayment {
  id: string;
  date: string;
  label: string;
  amountUsd: number;
  amountAed?: number;
  amountXaf?: number;
  currency?: string;
  account?: string; // 'Caisse (espèces)', 'Ecobank', etc.
  note?: string;
}

export interface SaleChargeItem {
  id: string;
  date: string;
  type: 'discount' | 'refining' | 'testing' | 'melting' | 'customs' | 'swap' | 'other';
  label: string;
  rateOrDetails?: string; // ex: '$11.50'
  amountUsd: number;
  amountAed?: number;
  amountXaf?: number;
}

export interface SaleRecord {
  id: string;
  reference: string; // ex: 'VTE-2026-0001'
  clientName: string;
  clientId?: string;
  clientReference?: string;
  clientPhone?: string;
  clientCity?: string;
  clientEmail?: string;
  clientBankName?: string;
  clientBankAccountNumber?: string;
  date: string; // ex: '20/10/2026'
  createdAt: string;

  // Bars table
  bars: SaleBarItem[];
  totalGeneralWeightGrams: number; // Total Bar Weight
  totalSampleWeightGrams: number; // Total Sample Weight
  averagePurity: number; // Pureté moyenne (AU %)
  averageCarat: number; // Carat moyen
  totalPureWeight24kGrams: number; // Total Poids Pur 24K (g)
  totalPureOunces: number; // Total Onces Pur (oz)

  // Fixing table
  fixingDate: string; // '20/10/2026' ou 'PENDING'
  fixingPricePerOunceUsd: number;
  fixings?: SaleFixingItem[];
  grossRevenueUsd: number; // ex: 39,486.39 $
  grossRevenueAed?: number; // ex: 144,915.05 AED
  grossRevenueXaf?: number; // ex: 24,000,000 FCFA

  // Charges & Deductions
  charges: SaleChargeItem[];
  totalChargesUsd: number;

  // Acomptes & Avances
  advances: SaleAdvancePayment[];
  totalAdvancesUsd: number;
  totalAdvancesAed?: number;

  // Total Withdraw & Solde restant
  totalWithdrawUsd: number; // Total charges + Total advances
  totalWithdrawAed?: number;
  totalWithdrawXaf?: number;

  balanceRemainingUsd: number; // Solde restant dû (Brut - Withdraw)
  balanceRemainingAed?: number;
  balanceRemainingXaf?: number;

  usdToAedRate?: number; // défaut 3.6725
  usdToXafRate?: number;
  status: 'pending' | 'partially_paid' | 'settled'; // 'settled' = soldé
  targetAccount?: string; // 'Caisse (espèces)', etc.
  notes?: string;
}

export interface GoldStockMovement {
  id: string;
  label: string;
  karat: string;
  weightGrams: number;
  date: string;
  type: string; // 'Achat' | 'Vente' | 'Correction' | 'Annulation'
  category: string;
  reason?: string;
  referenceId?: string;
}

export interface CurrencyStockMovement {
  id: string;
  currency: string;
  amount: number;
  type: string; // 'Achat devise' | 'Vente devise' | 'Change reçu' | 'Change remis' | 'Ajustement'
  label: string;
  date: string;
  rate?: number;
  totalXaf?: number;
  account?: string;
  contact?: string;
}

export type PartnershipScenario =
  | 'financialPurchase'
  | 'financialGold'
  | 'businessIntroducer'
  | 'meltingAndTransformation'
  | 'consignment'
  | 'financingAndManagement'
  | 'repayableAdvance'
  | 'operationalService';

export const PARTNERSHIP_SCENARIO_LABELS: Record<PartnershipScenario, string> = {
  financialPurchase: 'Financement d’un achat',
  financialGold: 'Financement contre apport en or',
  businessIntroducer: 'Apporteur d’affaires',
  meltingAndTransformation: 'Fonte et transformation',
  consignment: 'Consignation',
  financingAndManagement: 'Financement et gestion',
  repayableAdvance: 'Avance remboursable ou prêt',
  operationalService: 'Partenaire opérationnel',
};

export type PartnershipStatus =
  | 'draft'
  | 'pendingVerification'
  | 'pendingContractApproval'
  | 'contractApproved'
  | 'contributionsCommitted'
  | 'analysis'
  | 'transactionInProgress'
  | 'paymentPending'
  | 'partiallySettled'
  | 'settled'
  | 'disputed'
  | 'suspended'
  | 'rejected'
  | 'cancelled'
  | 'closed';

export const PARTNERSHIP_STATUS_LABELS: Record<PartnershipStatus, string> = {
  draft: 'Brouillon',
  pendingVerification: 'En attente de vérification',
  pendingContractApproval: 'En attente de validation du contrat',
  contractApproved: 'Contrat validé',
  contributionsCommitted: 'Apports engagés',
  analysis: 'Contrôle et analyse',
  transactionInProgress: 'Opération en cours',
  paymentPending: 'Paiement en attente',
  partiallySettled: 'Partiellement réglé',
  settled: 'Réglé',
  disputed: 'Contesté',
  suspended: 'Suspendu',
  rejected: 'Refusé',
  cancelled: 'Annulé',
  closed: 'Clôturé',
};

export type ContributionKind = 'financial' | 'metal' | 'service';

export const CONTRIBUTION_KIND_LABELS: Record<ContributionKind, string> = {
  financial: 'Apport financier',
  metal: 'Apport en métal',
  service: 'Prestation',
};

export type RemunerationMethod =
  | 'contractualProfitShares'
  | 'financialContributionRatio'
  | 'fixedCommission'
  | 'saleAmountCommission'
  | 'netProfitCommission'
  | 'managementFeeAndRemainder';

export const REMUNERATION_METHOD_LABELS: Record<RemunerationMethod, string> = {
  contractualProfitShares: 'Pourcentages définis au contrat',
  financialContributionRatio: 'Répartition selon les apports financiers',
  fixedCommission: 'Commission fixe',
  saleAmountCommission: 'Commission sur le montant de vente',
  netProfitCommission: 'Commission sur le bénéfice net',
  managementFeeAndRemainder: 'Rémunération de gestion et partage du solde',
};

export type PartnershipLoanDirection = 'companyBorrows' | 'companyLends';

export const PARTNERSHIP_LOAN_DIRECTION_LABELS: Record<PartnershipLoanDirection, string> = {
  companyBorrows: 'L’entreprise emprunte',
  companyLends: 'L’entreprise prête',
};

export interface PartnershipRepayment {
  id?: string;
  amountXaf: number;
  paidAt: string;
  note: string;
  createdBy: string;
}

export interface PartnershipLoan {
  id: string;
  reference: string;
  partnerName: string;
  partnerId?: number | string;
  direction: PartnershipLoanDirection;
  principalXaf: number;
  dueAt: string;
  note: string;
  createdAt: string;
  createdBy: string;
  repayments: PartnershipRepayment[];
}

export interface Partner {
  id: string;
  name: string;
  createdAt: string;
  phone: string;
  city: string;
  email: string;
  isActive: boolean;
  type: string;
}

export interface GoldAnalysis {
  netWeightGrams: number;
  purityPercent: number;
  isProvisional: boolean;
  analyzedAt?: string;
}

export interface PartnershipContribution {
  id?: string;
  kind: ContributionKind;
  isValidated: boolean;
  amountXaf?: number;
  grossWeightGrams?: number;
  netWeightGrams?: number;
  purityPercent?: number;
  purityIsProvisional: boolean;
  purityAnalyzedAt?: string;
  serviceDescription?: string;
}

export interface PartnershipMember {
  id?: string;
  partnerId?: number | string;
  name: string;
  role: string;
  phone?: string;
  city?: string;
  email?: string;
  profitSharePercent?: number;
  isCompany?: boolean;
  contributions: PartnershipContribution[];
}

export interface Partnership {
  id: string;
  reference: string;
  scenario: PartnershipScenario;
  status: PartnershipStatus;
  remunerationMethod: RemunerationMethod;
  remunerationValue?: number;
  note: string;
  createdAt: string;
  members: PartnershipMember[];
  analysisBefore?: GoldAnalysis;
  analysisAfter?: GoldAnalysis;
}

export type PartnershipCashMovementType = 'contribution' | 'goldPurchase' | 'goldSale';

export interface PartnershipCashMovement {
  id: string;
  type: PartnershipCashMovementType;
  amountXaf: number;
  description: string;
  partnerId?: string;
  partnerName?: string;
  contributor?: 'CAMS GOLD' | 'partner';
  weightGrams?: number;
  karat?: number;
  createdAt: string;
  createdBy: string;
}

export interface GoldPriceQuote {
  pricePerTroyOunceUsd: number;
  updatedAt: string;
  previousCloseUsd?: number;
  changePercent?: number;
  changeUsd?: number;
  source?: string;
  isLive?: boolean;
}

export interface PreciousMetalsSnapshot {
  gold: GoldPriceQuote;
  silver: GoldPriceQuote;
  updatedAt: string;
  source: string;
  isLive: boolean;
}

export interface ExchangeRateSnapshot {
  usdRates: Record<string, number>;
  updatedAt: string;
  source?: string;
  isLive?: boolean;
}

export type AppRole = 'ADMIN' | 'CASHIER' | 'BUYER' | 'SALES' | 'AUDITOR';

export const APP_ROLES: { id: AppRole; label: string; badge: string; color: string; description: string }[] = [
  {
    id: 'ADMIN',
    label: 'Administrateur / Gérant',
    badge: 'Direction',
    color: '#D39725',
    description: 'Accès total, assignation de tâches, clôture, arrêtés et validation générale.',
  },
  {
    id: 'CASHIER',
    label: 'Caissier / Trésorier',
    badge: 'Caisse & Devises',
    color: '#008B62',
    description: 'Entrées/sorties de caisse, virements clients, dépôts banque, achat/vente devises.',
  },
  {
    id: 'BUYER',
    label: 'Acheteur / Fondeur / Peseur',
    badge: 'Pesée & Appro',
    color: '#D97706',
    description: 'Réception or brut/fondu/bijoux, test densité/acide, pesées, achats fournisseurs.',
  },
  {
    id: 'SALES',
    label: 'Commercial & Export Dubaï',
    badge: 'Ventes & Dubaï',
    color: '#204B57',
    description: 'Bordereaux Dubaï (24K, OZ, fixings), suivi des acomptes et soldes clients.',
  },
  {
    id: 'AUDITOR',
    label: 'Auditeur / Contrôleur',
    badge: 'Audit & Stocks',
    color: '#6366F1',
    description: 'Contrôle des stocks or & devises, pointage des écritures et rapports d’activité.',
  },
];

export interface AppModuleInfo {
  id: number;
  key: string;
  label: string;
  category: string;
  description: string;
}

export const APP_MODULES_LIST: AppModuleInfo[] = [
  { id: 0, key: 'home', label: 'Accueil (Dashboard & Cours)', category: 'Général', description: 'Tableau de bord principal et cours de l’or' },
  { id: 1, key: 'cash', label: 'Caisse (Espèces & Virements)', category: 'Trésorerie', description: 'Entrées/Sorties de caisse, approvisionnements, virements clients et versements' },
  { id: 2, key: 'sales', label: 'Ventes Dubaï & Bordereaux', category: 'Commercial', description: 'Bordereaux d’export, calcul 24K, onces OZ, fixings et acomptes' },
  { id: 3, key: 'currency_stock', label: 'Stock Devises (Achat & Vente)', category: 'Devises', description: 'Achat/vente de devises USD, AED, EUR et gestion du stock physique' },
  { id: 4, key: 'partnerships', label: 'Partenariats & Investisseurs', category: 'Financement', description: 'Contrats de partenariat, apports financiers et prêts' },
  { id: 5, key: 'banks', label: 'Banques & Versements', category: 'Trésorerie', description: 'Soldes bancaires, versements de caisse vers banques et remises' },
  { id: 6, key: 'contacts', label: 'Clients & Fournisseurs', category: 'Répertoire', description: 'Répertoire commercial, typologies d’or et historiques complets' },
  { id: 7, key: 'appointments', label: 'Rendez-vous & Agenda', category: 'Commercial', description: 'Planning des réceptions et négociations au comptoir' },
  { id: 8, key: 'sms', label: 'SMS & Cotations', category: 'Communication', description: 'Envoi des cours officiels et communications clients' },
  { id: 9, key: 'reports', label: 'Rapports & Comptabilité', category: 'Comptabilité', description: 'Journal des opérations, bilans financiers et statistiques' },
  { id: 10, key: 'gold_stock', label: 'Gestion du Stock d’Or', category: 'Stock', description: 'Inventaire physique (Brut, Fondu, Bijoux), pesées et réconciliations' },
  { id: 12, key: 'users_admin', label: 'Utilisateurs & Droits d’Accès', category: 'Administration', description: 'Attribution des interfaces accessibles et assignation des tâches' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, number[]> = {
  ADMIN: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14],
  CASHIER: [0, 1, 3, 5, 6],
  SALES: [0, 2, 3, 6, 7],
  BUYER: [0, 6, 10],
  AUDITOR: [0, 1, 3, 5, 9, 10],
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AppRole;
  roleLabel: string;
  status: 'active' | 'suspended' | 'vacation';
  avatarBg?: string;
  createdAt: string;
  allowedModules: number[]; // Liste des IDs de modules autorisés (0, 1, 2, 3...)
}

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'validated';
export type TaskCategory =
  | 'Caisse & Trésorerie'
  | 'Ventes Dubaï'
  | 'Achats & Fonderie'
  | 'Stock Or & Devises'
  | 'Banques & Versements'
  | 'Clients & Fournisseurs'
  | 'Audit & Contrôle';

export interface AppTask {
  id: string;
  reference: string;
  title: string;
  description: string;
  assignedRole: AppRole | 'ALL';
  assignedUserId?: string;
  assignedUserName?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
  validatedAt?: string;
  completionNote?: string;
}

export interface RolePermission {
  role: AppRole;
  label: string;
  canManageUsers: boolean;
  canAssignTasks: boolean;
  canManageCash: boolean;
  canManageSales: boolean;
  canManagePurchases: boolean;
  canManageStock: boolean;
  canManageBanks: boolean;
  canViewReports: boolean;
}
