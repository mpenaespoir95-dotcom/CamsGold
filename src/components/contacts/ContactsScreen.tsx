import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Check,
  Building2,
  Gem,
  Flame,
  Mountain,
  ArrowLeftRight,
  Package,
  ShoppingCart,
  Layers,
  Sparkles,
  FileSpreadsheet,
  DollarSign,
  Wallet,
  Scale,
  Eye,
  Printer,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../context/AppContext';
import { AppPanel, Modal, PageHeading } from '../common/UIComponents';
import {
  Contact,
  SUPPLIER_ROLES,
  CLIENT_ROLES,
  OTHER_CONTACT_ROLES,
  SaleRecord,
} from '../../types';
import { formatNumber, formatMoney, formatOunces } from '../../utils/goldMath';
import { DubaiSettlementSheet } from '../sales/DubaiSettlementSheet';

export const ContactsScreen: React.FC = () => {
  const store = useAppStore();
  const [filter, setFilter] = useState<'Tous' | 'Fournisseurs' | 'Clients'>('Tous');
  const [typologyFilter, setTypologyFilter] = useState<'Tous' | 'Or brut' | 'Or fondu' | 'Bijoux' | 'Autres'>('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editContactDraft, setEditContactDraft] = useState<Partial<Contact>>({});

  // Sub-modal for viewing full Dubai Settlement Sheet
  const [viewingSettlementSale, setViewingSettlementSale] = useState<SaleRecord | null>(null);

  // Sub-modal for adding an advance (acompte) directly from client history
  const [advanceModalSale, setAdvanceModalSale] = useState<SaleRecord | null>(null);
  const [advanceAmountUsd, setAdvanceAmountUsd] = useState('');
  const [advanceAccount, setAdvanceAccount] = useState('Caisse (espèces)');
  const [advanceDate, setAdvanceDate] = useState('');
  const [advanceLabel, setAdvanceLabel] = useState('Acompte complémentaire');
  const [advanceNote, setAdvanceNote] = useState('');
  const [advanceClientName, setAdvanceClientName] = useState('');
  const [advanceClientPhone, setAdvanceClientPhone] = useState('');
  const [advanceClientCity, setAdvanceClientCity] = useState('');
  const [advanceClientEmail, setAdvanceClientEmail] = useState('');
  const [advanceClientBank, setAdvanceClientBank] = useState('');
  const [advanceClientBankAccount, setAdvanceClientBankAccount] = useState('');
  const [advanceFeedback, setAdvanceFeedback] = useState<string | null>(null);

  // Active tab inside contact detail view
  const [contactDetailTab, setContactDetailTab] = useState<'sales' | 'purchases' | 'info'>('sales');

  // Form states (sans notes internes)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Fournisseur d’or brut']);

  const handleToggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    store.addContact({
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      email: email.trim(),
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      roles: selectedRoles.length ? selectedRoles : ['Client de passage'],
    });

    setShowAddModal(false);
    setName('');
    setPhone('');
    setCity('');
    setEmail('');
    setBankName('');
    setBankAccountNumber('');
    setSelectedRoles(['Fournisseur d’or brut']);
  };

  const openEditContact = (contact: Contact) => {
    setEditContactDraft({
      name: contact.name,
      phone: contact.phone,
      city: contact.city,
      email: contact.email || '',
      bankName: contact.bankName || '',
      bankAccountNumber: contact.bankAccountNumber || '',
      roles: [...contact.roles],
    });
    setEditingContact(contact);
  };

  const handleUpdateContact = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingContact || !editContactDraft.name?.trim()) return;

    const updatedContact: Contact = {
      ...editingContact,
      name: editContactDraft.name.trim(),
      phone: editContactDraft.phone?.trim() || '',
      city: editContactDraft.city?.trim() || '',
      email: editContactDraft.email?.trim() || '',
      bankName: editContactDraft.bankName?.trim() || '',
      bankAccountNumber: editContactDraft.bankAccountNumber?.trim() || '',
      roles: editContactDraft.roles?.length ? editContactDraft.roles : ['Client de passage'],
    };

    store.updateContact(editingContact.reference, updatedContact);
    setSelectedContact(updatedContact);
    setEditingContact(null);
  };

  // Helpers pour les rôles et typologies
  const isSupplierContact = (roles: string[]) =>
    roles.some((r) => r.toLowerCase().includes('fournisseur'));

  const isClientContact = (roles: string[]) =>
    roles.some((r) => r.toLowerCase().includes('client'));

  const matchesTypology = (roles: string[], typo: 'Tous' | 'Or brut' | 'Or fondu' | 'Bijoux' | 'Autres') => {
    if (typo === 'Tous') return true;
    if (typo === 'Or brut') return roles.some((r) => r.toLowerCase().includes('brut'));
    if (typo === 'Or fondu') return roles.some((r) => r.toLowerCase().includes('fondu'));
    if (typo === 'Bijoux') return roles.some((r) => r.toLowerCase().includes('bijou'));
    if (typo === 'Autres') {
      return roles.some((r) => r.toLowerCase().includes('devise') || r.toLowerCase().includes('partenaire') || r.toLowerCase().includes('échange'));
    }
    return true;
  };

  const filteredContacts = store.contacts.filter((c) => {
    if (filter === 'Clients' && !isClientContact(c.roles)) {
      return false;
    }
    if (filter === 'Fournisseurs' && !isSupplierContact(c.roles)) {
      return false;
    }
    if (!matchesTypology(c.roles, typologyFilter)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.reference.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.roles.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalSuppliers = store.contacts.filter((c) => isSupplierContact(c.roles)).length;
  const totalClients = store.contacts.filter((c) => isClientContact(c.roles)).length;

  const renderRoleBadge = (role: string, idx: number) => {
    const rLower = role.toLowerCase();
    if (rLower.includes('fournisseur') && rLower.includes('brut')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold"
        >
          <Mountain size={12} />
          <span>Fournisseur Or brut</span>
        </span>
      );
    }
    if (rLower.includes('fournisseur') && rLower.includes('fondu')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-950 border border-orange-300 text-[10px] font-bold"
        >
          <Flame size={12} />
          <span>Fournisseur Or fondu</span>
        </span>
      );
    }
    if (rLower.includes('fournisseur') && rLower.includes('bijou')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-950 border border-purple-300 text-[10px] font-bold"
        >
          <Gem size={12} />
          <span>Fournisseur Bijoux</span>
        </span>
      );
    }
    if (rLower.includes('client') && rLower.includes('brut')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-950 border border-amber-400 text-[10px] font-bold"
        >
          <Mountain size={12} />
          <span>Client Or brut</span>
        </span>
      );
    }
    if (rLower.includes('client') && rLower.includes('fondu')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-[#784e09] border border-amber-500/40 text-[10px] font-bold"
        >
          <Flame size={12} />
          <span>Client Or fondu</span>
        </span>
      );
    }
    if (rLower.includes('client') && rLower.includes('bijou')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-950 border border-fuchsia-300 text-[10px] font-bold"
        >
          <Gem size={12} />
          <span>Client Bijoux</span>
        </span>
      );
    }
    if (rLower.includes('devise') || rLower.includes('échange')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 text-[10px] font-bold"
        >
          <ArrowLeftRight size={12} />
          <span>{role}</span>
        </span>
      );
    }
    if (rLower.includes('partenaire')) {
      return (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-950 border border-blue-300 text-[10px] font-bold"
        >
          <span>🤝</span>
          <span>{role}</span>
        </span>
      );
    }
    return (
      <span
        key={idx}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-semibold"
      >
        {role}
      </span>
    );
  };

  // Retrieve sales associated with the selected contact
  const getContactSales = (contact: Contact): SaleRecord[] => {
    const cName = contact.name.toLowerCase().trim();
    return store.saleRecords.filter((s) => {
      if (s.clientId && (s.clientId === contact.id || s.clientId === contact.reference)) return true;
      if (s.clientReference && s.clientReference === contact.reference) return true;
      const sClient = s.clientName.toLowerCase().trim();
      return sClient === cName || sClient.includes(cName) || cName.includes(sClient);
    });
  };

  // Retrieve purchases associated with the selected contact (as supplier)
  const getContactPurchases = (contact: Contact) => {
    const cName = contact.name.toLowerCase().trim();
    return store.purchases.filter((p) => {
      const pSupplier = (p.supplier || '').toLowerCase().trim();
      return pSupplier === cName || pSupplier.includes(cName) || cName.includes(pSupplier);
    });
  };

  // Handle adding advance to sale from client modal
  const handleExecuteAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceModalSale) return;
    const amountNum = parseFloat(advanceAmountUsd.replace(',', '.') || '0');
    if (amountNum <= 0) {
      alert('Veuillez saisir un montant positif pour l’acompte.');
      return;
    }
    if (amountNum > advanceModalSale.balanceRemainingUsd) {
      alert(
        `L’acompte ($${amountNum.toFixed(2)}) ne peut pas dépasser le solde restant ($${advanceModalSale.balanceRemainingUsd.toFixed(2)}).`
      );
      return;
    }

    try {
      store.addSaleAdvance(advanceModalSale.id, {
        date: advanceDate.trim() || new Date().toLocaleDateString('fr-FR'),
        label: advanceLabel.trim() || 'Acompte complémentaire',
        amountUsd: amountNum,
        account: advanceAccount,
        note: advanceNote.trim() || `Acompte client ${selectedContact?.name || ''}`,
      }, {
        clientName: advanceClientName.trim(),
        clientReference: advanceModalSale.clientReference || selectedContact?.reference,
        clientPhone: advanceClientPhone.trim(),
        clientCity: advanceClientCity.trim(),
        clientEmail: advanceClientEmail.trim(),
        clientBankName: advanceClientBank.trim(),
        clientBankAccountNumber: advanceClientBankAccount.trim(),
      });

      setAdvanceFeedback(`Acompte de $${amountNum.toFixed(2)} enregistré avec succès sur la vente.`);
      setAdvanceModalSale(null);
      setAdvanceAmountUsd('');
      setTimeout(() => setAdvanceFeedback(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  // Calculations for selected contact
  const contactSales = selectedContact ? getContactSales(selectedContact) : [];
  const contactPurchases = selectedContact ? getContactPurchases(selectedContact) : [];

  const totalClientSalesUsd = contactSales.reduce((acc, s) => acc + s.grossRevenueUsd, 0);
  const totalClientAdvancesUsd = contactSales.reduce((acc, s) => acc + s.totalAdvancesUsd, 0);
  const totalClientBalanceRemainingUsd = contactSales.reduce((acc, s) => acc + s.balanceRemainingUsd, 0);
  const totalClientPureGrams = contactSales.reduce((acc, s) => acc + s.totalPureWeight24kGrams, 0);
  const totalClientGeneralGrams = contactSales.reduce((acc, s) => acc + s.totalGeneralWeightGrams, 0);
  const totalClientOunces = contactSales.reduce((acc, s) => acc + s.totalPureOunces, 0);

  const availableAccounts = ['Caisse (espèces)', ...Object.keys(store.bankBalances).filter((b) => b !== 'Caisse (espèces)')];

  return (
    <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
      <PageHeading
        eyebrow="Répertoire Commercial & Comptoir"
        title="Fournisseurs & Clients"
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D39725] hover:bg-[#c2871b] text-white text-xs font-bold cursor-pointer shadow-xs transition-colors"
          >
            <Plus size={16} />
            <span>Nouveau contact (Fournisseur / Client)</span>
          </button>
        }
      />

      {advanceFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{advanceFeedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, ville, téléphone, référence, rôle..."
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-[#E8D8BE] text-xs focus:outline-hidden focus:border-[#D39725] shadow-2xs"
            />
          </div>

          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F3] rounded-2xl border border-[#E8D8BE]">
            <button
              onClick={() => setFilter('Tous')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'Tous'
                  ? 'bg-[#192A24] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#192A24]'
              }`}
            >
              Tous ({store.contacts.length})
            </button>
            <button
              onClick={() => setFilter('Fournisseurs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'Fournisseurs'
                  ? 'bg-[#D39725] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#D39725]'
              }`}
            >
              <span>Fournisseurs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {totalSuppliers}
              </span>
            </button>
            <button
              onClick={() => setFilter('Clients')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'Clients'
                  ? 'bg-[#192A24] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#192A24]'
              }`}
            >
              <span>Clients</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-mono">
                {totalClients}
              </span>
            </button>
          </div>
        </div>

        {/* Secondary Sub-filters: Or brut, Or fondu, Bijoux */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
            Typologie d'or :
          </span>
          {[
            { id: 'Tous', label: 'Toutes typologies' },
            { id: 'Or brut', label: 'Or brut', icon: Mountain, desc: 'Mines & Orpaillage' },
            { id: 'Or fondu', label: 'Or fondu', icon: Flame, desc: 'Lingots & Fonderie' },
            { id: 'Bijoux', label: 'Bijoux', icon: Gem, desc: 'Pièces ouvrées' },
            { id: 'Autres', label: 'Devises / Partenaires', icon: ArrowLeftRight, desc: 'Autres' },
          ].map((tab) => {
            const isActive = typologyFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTypologyFilter(tab.id as typeof typologyFilter)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-100 text-amber-950 border border-amber-400 shadow-2xs'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {tab.icon && <tab.icon size={13} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Table */}
      <AppPanel padding="p-0" className="overflow-hidden shadow-xs">
        {filteredContacts.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-2">
            <Users size={32} className="mx-auto text-gray-300" />
            <div className="font-bold text-gray-700">Aucun contact ne correspond à ce filtre.</div>
            <div className="text-gray-400">
              Essayez de modifier la recherche ou le filtre de typologie (Or brut, Or fondu, Bijoux).
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                  <th className="py-3 px-4">N°</th>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Nom / Entité</th>
                  <th className="py-3 px-4">Ville</th>
                  <th className="py-3 px-4">Téléphone</th>
                  <th className="py-3 px-4">Qualité & Typologie d'or</th>
                  <th className="py-3 px-4 text-center">Historique Ventes / Achats</th>
                  <th className="py-3 px-4 text-right">Fiche Complète</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((c, idx) => {
                  const salesCount = getContactSales(c).length;
                  const purchasesCount = getContactPurchases(c).length;
                  return (
                    <tr
                      key={c.reference}
                      onClick={() => setSelectedContact(c)}
                      className="hover:bg-amber-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#D39725]">{c.reference}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#192A24] hover:text-[#D39725]">
                          {c.name}
                        </div>
                        {c.email && <span className="text-[10px] text-gray-400 block">{c.email}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-gray-400" />
                          <span>{c.city}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-gray-700">{c.phone}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {c.roles.map((r, rIdx) => renderRoleBadge(r, rIdx))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {salesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300">
                              <FileSpreadsheet size={11} />
                              <span>{salesCount} vente{salesCount > 1 ? 's' : ''}</span>
                            </span>
                          ) : isClientContact(c.roles) ? (
                            <span className="text-[10px] text-gray-400 font-medium">0 vente</span>
                          ) : null}

                          {purchasesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                              <span>📦 {purchasesCount} appro</span>
                            </span>
                          ) : isSupplierContact(c.roles) ? (
                            <span className="text-[10px] text-gray-400 font-medium">0 appro</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContact(c);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E8D8BE] hover:border-[#D39725] hover:text-[#D39725] text-[11px] font-bold cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Voir historique</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AppPanel>

      {/* Modal Add Contact (Fournisseur / Client : Or brut, Or fondu, Bijoux) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Ajouter un contact · Fournisseur ou Client"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Nom complet ou Société *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du client ou fournisseur"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold text-[#192A24]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">
                Téléphone principal *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 ... / +223 76 ..."
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Ville / Pays</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex: Dubaï (EAU), Bamako, Abidjan..."
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#192A24] mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@exemple.com"
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>
          </div>

          {/* Coordonnées bancaires pour virements clients ou règlements fournisseurs */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                Banque du contact (Optionnel)
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="ex: Emirates NBD, Ecobank, UBA..."
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D8BE] text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#192A24] mb-1">
                N° Compte / RIB / IBAN
              </label>
              <input
                type="text"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="N° de compte bancaire pour virement"
                className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D8BE] text-xs font-mono"
              />
            </div>
          </div>

          {/* SECTION FOURNISSEUR : Or brut, Or fondu, Bijoux */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/40 border border-amber-300/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                <Package size={14} />
                <span>Fournisseur d’or (Achats & Approvisionnements)</span>
              </span>
              <span className="text-[11px] text-amber-800 font-semibold">Cochez les spécialités</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  role: 'Fournisseur d’or brut',
                  label: 'Fournisseur d’or brut',
                  icon: Mountain,
                  sub: 'Poudre, pépites, brut minier',
                },
                {
                  role: 'Fournisseur d’or fondu',
                  label: 'Fournisseur d’or fondu',
                  icon: Flame,
                  sub: 'Lingotins, barres, fonderie',
                },
                {
                  role: 'Fournisseur de bijoux',
                  label: 'Fournisseur de bijoux',
                  icon: Gem,
                  sub: 'Bijoux cassés, débris ouvrés',
                },
              ].map((item) => {
                const isChecked = selectedRoles.includes(item.role);
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleToggleRole(item.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isChecked
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <item.icon size={16} />
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-white text-amber-700 font-black' : 'border border-gray-300'
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </span>
                    </div>
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isChecked ? 'text-amber-100' : 'text-gray-400'}`}>
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION CLIENT : Or brut, Or fondu, Bijoux */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-300/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                <ShoppingCart size={14} />
                <span>Client d’or (Ventes & Export)</span>
              </span>
              <span className="text-[11px] text-emerald-800 font-semibold">Cochez les spécialités</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  role: 'Client d’or brut',
                  label: 'Client d’or brut',
                  icon: Mountain,
                  sub: 'Acheteurs raffineries & brut',
                },
                {
                  role: 'Client d’or fondu',
                  label: 'Client d’or fondu',
                  icon: Flame,
                  sub: 'Négociants export, Dubaï, lingots',
                },
                {
                  role: 'Client de bijoux',
                  label: 'Client de bijoux',
                  icon: Gem,
                  sub: 'Bijoutiers, ateliers, pièces finies',
                },
              ].map((item) => {
                const isChecked = selectedRoles.includes(item.role);
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleToggleRole(item.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isChecked
                        ? 'bg-[#192A24] text-white border-[#192A24] shadow-xs ring-2 ring-[#192A24]/40'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <item.icon size={16} />
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-[#D39725] text-white font-black' : 'border border-gray-300'
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </span>
                    </div>
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isChecked ? 'text-gray-300' : 'text-gray-400'}`}>
                      {item.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Autres rôles (Change & Partenariat) */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
              Autres activités optionnelles (Change & Partenariats)
            </label>
            <div className="flex flex-wrap gap-2">
              {OTHER_CONTACT_ROLES.map((r) => {
                const isChecked = selectedRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleToggleRole(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-gray-800 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span>{r}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions modal */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] hover:bg-[#c2871b] text-white shadow-xs cursor-pointer transition-colors"
            >
              Enregistrer le contact
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingContact)}
        onClose={() => setEditingContact(null)}
        title={`Modifier le contact · ${editingContact?.reference || ''}`}
        maxWidth="max-w-2xl"
      >
        {editingContact && (
          <form onSubmit={handleUpdateContact} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-[#192A24]">
                Nom / Entité *
                <input
                  type="text"
                  required
                  value={editContactDraft.name || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, name: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                Téléphone
                <input
                  type="tel"
                  value={editContactDraft.phone || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, phone: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                Ville
                <input
                  type="text"
                  value={editContactDraft.city || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, city: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                E-mail
                <input
                  type="email"
                  value={editContactDraft.email || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, email: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                Banque
                <input
                  type="text"
                  value={editContactDraft.bankName || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, bankName: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
                />
              </label>
              <label className="block text-xs font-bold text-[#192A24]">
                Compte / RIB
                <input
                  type="text"
                  value={editContactDraft.bankAccountNumber || ''}
                  onChange={(event) => setEditContactDraft((draft) => ({ ...draft, bankAccountNumber: event.target.value }))}
                  className="mt-1 w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-mono"
                />
              </label>
            </div>

            <fieldset className="space-y-2 rounded-xl border border-[#E8D8BE] p-3">
              <legend className="px-1 text-xs font-bold text-[#192A24]">Qualité & typologie d’or</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...SUPPLIER_ROLES, ...CLIENT_ROLES, ...OTHER_CONTACT_ROLES].map((role) => {
                  const checked = editContactDraft.roles?.includes(role) ?? false;
                  return (
                    <label key={role} className="flex items-center gap-2 rounded-lg bg-[#FAF8F3] px-3 py-2 text-xs font-semibold text-[#192A24]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setEditContactDraft((draft) => ({
                          ...draft,
                          roles: checked
                            ? (draft.roles || []).filter((item) => item !== role)
                            : [...(draft.roles || []), role],
                        }))}
                        className="accent-[#D39725]"
                      />
                      {role}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D39725] hover:bg-[#c2871b] text-white"
              >
                Enregistrer les modifications
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* MODAL FICHE COMPLETE CONTACT AVEC TOUT L'HISTORIQUE DE VENTE      */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(selectedContact) && !editingContact}
        onClose={() => setSelectedContact(null)}
        title={`Fiche Complète & Historique · ${selectedContact?.name || ''}`}
        maxWidth="max-w-5xl"
      >
        {selectedContact && (
          <div className="space-y-5 text-xs">
            {/* Header Profil Contact */}
            <div className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8D8BE] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#D39725]/20 text-[#D39725] flex items-center justify-center font-black text-2xl shadow-2xs">
                  {selectedContact.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-[#192A24]">{selectedContact.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white border border-[#E8D8BE] text-[#D39725] font-bold">
                      {selectedContact.reference}
                    </span>
                  </div>
                  <div className="text-[#7D8176] flex items-center gap-3 mt-1 text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-[#D39725]" />
                      <span>{selectedContact.city || 'Ville non précisée'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono font-bold text-gray-700">
                      <Phone size={13} className="text-[#D39725]" />
                      <span>{selectedContact.phone}</span>
                    </span>
                    {selectedContact.email && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Mail size={13} className="text-[#D39725]" />
                        <span>{selectedContact.email}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditContact(selectedContact)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E8D8BE] hover:border-[#D39725] hover:text-[#D39725] text-[11px] font-bold cursor-pointer"
                >
                  Modifier les informations
                </button>
                <div className="flex flex-wrap gap-1.5 max-w-sm justify-start md:justify-end">
                  {selectedContact.roles.map((r, i) => renderRoleBadge(r, i))}
                </div>
              </div>
            </div>

            {/* Coordonnées bancaires & détails de paiement */}
            {selectedContact.bankName && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-blue-950">
                  <Building2 size={16} className="text-blue-700" />
                  <span>
                    Coordonnées Bancaires pour règlements : <strong>{selectedContact.bankName}</strong>
                    {selectedContact.bankAccountNumber ? ` · RIB / Compte : ${selectedContact.bankAccountNumber}` : ''}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                  Virements directs
                </span>
              </div>
            )}

            {/* Navigation Tabs in Contact View */}
            <div className="flex items-center gap-2 border-b border-[#E8D8BE] pb-2">
              <button
                type="button"
                onClick={() => setContactDetailTab('sales')}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  contactDetailTab === 'sales'
                    ? 'bg-[#192A24] text-white shadow-xs'
                    : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileSpreadsheet size={15} />
                <span>
                  Bordereaux de Vente Dubaï ({contactSales.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setContactDetailTab('purchases')}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  contactDetailTab === 'purchases'
                    ? 'bg-[#D39725] text-white shadow-xs'
                    : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Scale size={15} />
                <span>
                  Approvisionnements Fournisseur ({contactPurchases.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setContactDetailTab('info')}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  contactDetailTab === 'info'
                    ? 'bg-gray-800 text-white shadow-xs'
                    : 'bg-[#FAF8F3] text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 size={15} />
                <span>Coordonnées & RIB</span>
              </button>
            </div>

            {/* TAB 1: HISTORIQUE DES VENTES & BORDEREAUX DE RÈGLEMENT DUBAÏ */}
            {contactDetailTab === 'sales' && (
              <div className="space-y-4">
                {/* Global Client Sales Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE]">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Total Poids Général</div>
                    <div className="text-base font-black font-mono text-[#192A24] mt-0.5">
                      {formatNumber(totalClientGeneralGrams, 3)} g
                    </div>
                    <div className="text-[10px] text-gray-400">Poids total livré/pesé</div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-900 uppercase">Poids Pur 24K (oz)</div>
                    <div className="text-base font-black font-mono text-amber-950 mt-0.5">
                      {formatNumber(totalClientPureGrams, 3)} g
                    </div>
                    <div className="text-[10px] font-bold text-amber-800 font-mono">
                      {formatNumber(totalClientOunces, 2)} oz troy
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-900 uppercase">Total Acomptes Versés</div>
                    <div className="text-base font-black font-mono text-emerald-950 mt-0.5">
                      ${formatNumber(totalClientAdvancesUsd, 2)}
                    </div>
                    <div className="text-[10px] text-emerald-800">
                      AED {formatNumber(totalClientAdvancesUsd * 3.6725, 2)}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    totalClientBalanceRemainingUsd > 0
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="text-[10px] font-bold text-orange-950 uppercase">Solde Restant Dû</div>
                    <div className="text-base font-black font-mono text-orange-950 mt-0.5">
                      ${formatNumber(totalClientBalanceRemainingUsd, 2)}
                    </div>
                    <div className="text-[10px] text-orange-800 font-bold">
                      {totalClientBalanceRemainingUsd > 0
                        ? `AED ${formatNumber(totalClientBalanceRemainingUsd * 3.6725, 2)} dû`
                        : 'Totalement soldé'}
                    </div>
                  </div>
                </div>

                {/* Sales List Table */}
                {contactSales.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#FAF8F3] rounded-2xl border border-[#E8D8BE] space-y-2">
                    <FileSpreadsheet size={28} className="mx-auto text-gray-300" />
                    <div className="font-bold text-gray-700">Aucun bordereau de vente enregistré pour ce client.</div>
                    <div className="text-gray-400">
                      Vous pouvez créer une vente avec bordereau Dubaï (barres, AU %, carats, 24K, fixings, acomptes) dans le menu Ventes.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-black text-[#192A24] uppercase tracking-wide flex items-center justify-between">
                      <span>Bordereaux de Vente & Règlements d'Export ({contactSales.length})</span>
                      <span className="text-[11px] text-gray-500 font-normal">
                        Cliquez sur "Bordereau Dubaï" pour afficher l'état complet avec les 3 tableaux
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#E8D8BE]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Réf & Date</th>
                            <th className="py-2.5 px-3">Barres & Réf</th>
                            <th className="py-2.5 px-3 text-right">Poids Général</th>
                            <th className="py-2.5 px-3 text-right">Poids Pur 24K (oz)</th>
                            <th className="py-2.5 px-3 text-right">Fixing ($/oz)</th>
                            <th className="py-2.5 px-3 text-right">Total Brut $</th>
                            <th className="py-2.5 px-3 text-right">Acomptes Reçus</th>
                            <th className="py-2.5 px-3 text-right">Solde Dû</th>
                            <th className="py-2.5 px-3 text-center">Statut</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {contactSales.map((s) => (
                            <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                              <td className="py-3 px-3">
                                <span className="font-mono font-bold text-[#D39725] block">
                                  {s.reference}
                                </span>
                                <span className="text-[10px] text-gray-500">{s.date}</span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  {s.bars.map((b) => (
                                    <div key={b.id || b.srNo} className="font-mono text-[11px]">
                                      <span className="font-bold text-gray-900">{b.barRef}</span>
                                      <span className="text-gray-500"> ({formatNumber(b.barWeight, 2)}g @ {(b.goldPurity * 100).toFixed(1)}% / {b.carat}K)</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-gray-800">
                                {formatNumber(s.totalGeneralWeightGrams, 3)} g
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black text-amber-950">
                                <div>{formatNumber(s.totalPureWeight24kGrams, 3)} g</div>
                                <div className="text-[10px] text-amber-800 font-bold">
                                  {formatNumber(s.totalPureOunces, 2)} oz
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">
                                ${formatNumber(s.fixingPricePerOunceUsd, 2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                                ${formatNumber(s.grossRevenueUsd, 2)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                                <div>${formatNumber(s.totalAdvancesUsd, 2)}</div>
                                <div className="text-[10px] text-emerald-900">
                                  AED {formatNumber(s.totalAdvancesAed || s.totalAdvancesUsd * 3.6725, 2)}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black">
                                <div className={s.balanceRemainingUsd > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                                  ${formatNumber(s.balanceRemainingUsd, 2)}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  AED {formatNumber(s.balanceRemainingAed || s.balanceRemainingUsd * 3.6725, 2)}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    s.status === 'settled'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {s.status === 'settled' ? 'Soldé' : 'Solde dû'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSettlementSale(s)}
                                    className="px-2.5 py-1 rounded-lg bg-[#204B57] hover:bg-[#163842] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                    title="Afficher le bordereau officiel avec les 3 tableaux"
                                  >
                                    <Eye size={12} />
                                    <span>Bordereau Dubaï</span>
                                  </button>

                                  {s.balanceRemainingUsd > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAdvanceModalSale(s);
                                        setAdvanceAmountUsd(s.balanceRemainingUsd.toFixed(2));
                                        setAdvanceDate(new Date().toLocaleDateString('fr-FR'));
                                        setAdvanceLabel('Acompte complémentaire');
                                        setAdvanceNote(`Règlement pour ${selectedContact.name}`);
                                        setAdvanceClientName(s.clientName || selectedContact.name);
                                        setAdvanceClientPhone(s.clientPhone || selectedContact.phone || '');
                                        setAdvanceClientCity(s.clientCity || selectedContact.city || '');
                                        setAdvanceClientEmail(s.clientEmail || selectedContact.email || '');
                                        setAdvanceClientBank(s.clientBankName || selectedContact.bankName || '');
                                        setAdvanceClientBankAccount(s.clientBankAccountNumber || selectedContact.bankAccountNumber || '');
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#D39725] hover:bg-[#c2871b] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                      title="Verser un acompte sur ce bordereau"
                                    >
                                      <Plus size={12} />
                                      <span>+ Acompte</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HISTORIQUE FOURNISSEUR / ACHATS D'OR */}
            {contactDetailTab === 'purchases' && (
              <div className="space-y-4">
                {contactPurchases.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 bg-[#FAF8F3] rounded-2xl border border-[#E8D8BE] space-y-2">
                    <Scale size={28} className="mx-auto text-gray-300" />
                    <div className="font-bold text-gray-700">Aucun approvisionnement enregistré pour ce contact.</div>
                    <div className="text-gray-400">
                      Les réceptions de matière première (or brut, or fondu, bijoux) apparaîtront ici.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E8D8BE]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F3] border-b border-[#E8D8BE] text-[11px] font-bold text-[#7D8176] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Réf & Date</th>
                          <th className="py-2.5 px-3">Désignation</th>
                          <th className="py-2.5 px-3">Catégorie</th>
                          <th className="py-2.5 px-3 text-right">Poids Brut</th>
                          <th className="py-2.5 px-3 text-right">Titre / Carats</th>
                          <th className="py-2.5 px-3 text-right">Montant (FCFA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {contactPurchases.map((p) => (
                          <tr key={p.id} className="hover:bg-amber-50/40">
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-[#D39725]">{p.reference}</span>
                              <div className="text-[10px] text-gray-400">{p.purchasedAt}</div>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{p.description}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                {p.goldCategory}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {formatNumber(p.grossWeightGrams || 0, 2)} g
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                              {p.karat || `${p.purityPercent || 0}%`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-gray-900">
                              {formatMoney(p.amount)} FCFA
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COORDONNÉES & RIB */}
            {contactDetailTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-3">
                  <div className="text-xs font-black text-[#192A24] uppercase tracking-wider">
                    Informations Commerciales
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-gray-200 pb-1.5">
                      <span className="text-gray-500">Nom commercial :</span>
                      <span className="font-bold text-gray-900">{selectedContact.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1.5">
                      <span className="text-gray-500">Référence client :</span>
                      <span className="font-mono font-bold text-[#D39725]">{selectedContact.reference}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1.5">
                      <span className="text-gray-500">Téléphone :</span>
                      <span className="font-mono font-bold text-gray-800">{selectedContact.phone}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-1.5">
                      <span className="text-gray-500">Ville / Pays :</span>
                      <span className="font-bold text-gray-800">{selectedContact.city || 'Non renseigné'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email :</span>
                      <span className="text-gray-700">{selectedContact.email || 'Non renseigné'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                  <div className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} />
                    <span>Règlement & Virement Bancaire</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-amber-200 pb-1.5">
                      <span className="text-amber-900">Banque principale :</span>
                      <span className="font-bold text-gray-900">
                        {selectedContact.bankName || 'Aucune banque enregistrée'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-amber-200 pb-1.5">
                      <span className="text-amber-900">N° de Compte / RIB :</span>
                      <span className="font-mono font-bold text-gray-900">
                        {selectedContact.bankAccountNumber || 'Non renseigné'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-[11px] text-gray-600">
                      💡 Vous pouvez effectuer des virements directs depuis la Caisse ou les Banques CAMSGOLD vers ce compte client via le bouton "Virement client" de la Caisse.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* SUB-MODAL : AFFICHAGE DU BORDEREAU OFFICIEL DUBAÏ (3 TABLEAUX)     */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(viewingSettlementSale)}
        onClose={() => setViewingSettlementSale(null)}
        title={`Bordereau de Règlement Export (Account Sale) · ${viewingSettlementSale?.reference || ''}`}
        maxWidth="max-w-4xl"
      >
        {viewingSettlementSale && (
          <div className="space-y-4">
            <DubaiSettlementSheet
              sale={viewingSettlementSale}
              onPrint={() => window.print()}
              showPrintButton={true}
            />
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setViewingSettlementSale(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================================================================= */}
      {/* SUB-MODAL : VERSEMENT D'UN ACOMPTE SUR UNE VENTE CLIENT           */}
      {/* ================================================================= */}
      <Modal
        isOpen={Boolean(advanceModalSale)}
        onClose={() => setAdvanceModalSale(null)}
        title={`Enregistrer un acompte · Vente ${advanceModalSale?.reference || ''}`}
        maxWidth="max-w-md"
      >
        {advanceModalSale && (
          <form onSubmit={handleExecuteAdvance} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
              <div className="text-[11px] font-bold text-amber-900">
                Client : <strong>{advanceModalSale.clientName}</strong>
              </div>
              <div className="text-[11px] font-mono text-gray-700">
                Solde actuel restant :{' '}
                <strong className="text-amber-900">${advanceModalSale.balanceRemainingUsd.toFixed(2)}</strong> (
                AED {(advanceModalSale.balanceRemainingUsd * (advanceModalSale.usdToAedRate || 3.6725)).toFixed(2)})
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#E8D8BE] space-y-3">
              <div className="font-bold text-[#192A24]">Coordonnées à afficher sur le bordereau</div>
              {advanceModalSale.clientReference && (
                <div className="text-[11px] text-gray-500">Référence client : {advanceModalSale.clientReference}</div>
              )}
              <label className="block text-xs font-bold text-gray-700">
                Nom du client
                <input required value={advanceClientName} onChange={(event) => setAdvanceClientName(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
                <label>
                  Téléphone
                  <input value={advanceClientPhone} onChange={(event) => setAdvanceClientPhone(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
                </label>
                <label>
                  Ville
                  <input value={advanceClientCity} onChange={(event) => setAdvanceClientCity(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
                </label>
                <label>
                  E-mail
                  <input type="email" value={advanceClientEmail} onChange={(event) => setAdvanceClientEmail(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
                </label>
                <label>
                  Banque du client
                  <input value={advanceClientBank} onChange={(event) => setAdvanceClientBank(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
                </label>
                <label className="col-span-2">
                  Compte bancaire du client
                  <input value={advanceClientBankAccount} onChange={(event) => setAdvanceClientBankAccount(event.target.value)} className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-[#E8D8BE] font-normal" />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Montant de l’acompte en USD ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
                <input
                  type="text"
                  required
                  value={advanceAmountUsd}
                  onChange={(e) => setAdvanceAmountUsd(e.target.value)}
                  placeholder="ex: 1500.00"
                  className="w-full pl-8 pr-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] font-mono font-bold text-sm text-[#192A24]"
                />
              </div>
              {parseFloat(advanceAmountUsd || '0') > 0 && (
                <div className="text-[11px] text-gray-500 mt-1 font-mono">
                  ≈ AED {(parseFloat(advanceAmountUsd || '0') * (advanceModalSale.usdToAedRate || 3.6725)).toFixed(2)} · ≈{' '}
                  {formatMoney(
                    Math.round(parseFloat(advanceAmountUsd || '0') * (advanceModalSale.usdToXafRate ?? 0))
                  )}{' '}
                  FCFA
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Compte d’encaissement CAMSGOLD *
              </label>
              <select
                value={advanceAccount}
                onChange={(e) => setAdvanceAccount(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
              >
                {availableAccounts.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                <input
                  type="text"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  placeholder="20/10/2026"
                  className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Libellé</label>
                <input
                  type="text"
                  value={advanceLabel}
                  onChange={(e) => setAdvanceLabel(e.target.value)}
                  placeholder="ex: Acompte n°2"
                  className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Note / Justificatif</label>
              <input
                type="text"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                placeholder="Règlement espèces / bordereau remise..."
                className="w-full px-3 py-2 bg-[#FAF8F3] rounded-xl border border-[#E8D8BE] text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setAdvanceModalSale(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D39725] hover:bg-[#c2871b] text-white shadow-xs cursor-pointer"
              >
                Valider l’acompte
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
