import React from 'react';
import { DepositDenominations } from '../../types';
import { formatMoney } from '../../utils/goldMath';
import { numberToWordsFr } from '../../utils/numberToWordsFr';

export type BankSlipLayout = 'ecobank' | 'uba' | 'bsca' | 'boa';
type DenominationEntry = readonly [label: string, key: keyof DepositDenominations, value: number];

interface BankDepositSlipLayoutsProps {
  layout: BankSlipLayout;
  bankName: string;
  slipNumber: string;
  date: string;
  accountNumber: string;
  accountHolder: string;
  accountAddress: string;
  depositorName: string;
  depositorAddress: string;
  depositorPhone: string;
  amount: number;
  provenance: string;
  denominations: DepositDenominations;
}

const bills: DenominationEntry[] = [
  ['10 000', 'b10000', 10000],
  ['5 000', 'b5000', 5000],
  ['2 000', 'b2000', 2000],
  ['1 000', 'b1000', 1000],
  ['500', 'b500', 500],
] as const;

const coins: DenominationEntry[] = [
  ['500', 'p500', 500],
  ['200', 'p200', 200],
  ['100', 'p100', 100],
  ['50', 'p50', 50],
  ['25', 'p25', 25],
  ['10', 'p10', 10],
  ['5', 'p5', 5],
  ['2', 'p2', 2],
  ['1', 'p1', 1],
] as const;

const ecobankCoins: DenominationEntry[] = [
  ['500', 'p500', 500],
  ['100', 'p100', 100],
  ['50', 'p50', 50],
  ['25', 'p25', 25],
  ['10', 'p10', 10],
  ['5', 'p5', 5],
];

const countFor = (denominations: DepositDenominations, key: string): number => {
  return denominations[key as keyof DepositDenominations] ?? 0;
};

const Field: React.FC<{ label: string; value?: string; className?: string }> = ({
  label,
  value,
  className = '',
}) => (
  <div className={`min-h-7 border-b border-dotted border-gray-500 ${className}`}>
    <span className="font-bold">{label} </span>
    <span>{value || ''}</span>
  </div>
);

const AmountWords: React.FC<{ amount: number }> = ({ amount }) => (
  <Field label="Montant en lettres :" value={`${numberToWordsFr(amount)} francs CFA`} />
);

const PlainDenominationTable: React.FC<{
  denominations: DepositDenominations;
  values: DenominationEntry[];
}> = ({ denominations, values }) => (
  <table className="w-full border-collapse text-center">
    <thead>
      <tr>
        <th className="border border-black p-1">Coupure</th>
        <th className="border border-black p-1">Nombre</th>
        <th className="border border-black p-1">Montant</th>
      </tr>
    </thead>
    <tbody>
      {values.map(([label, key, value]) => {
        const count = countFor(denominations, key);
        return (
          <tr key={key}>
            <td className="border border-black p-1">{label}</td>
            <td className="border border-black p-1">{count || ''}</td>
            <td className="border border-black p-1">{count ? formatMoney(count * value) : ''}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const DetailedDenominationTable: React.FC<{
  denominations: DepositDenominations;
  values: DenominationEntry[];
  title?: string;
}> = ({ denominations, values, title }) => {
  const subtotal = values.reduce((sum, [, key, value]) => {
    return sum + countFor(denominations, key) * value;
  }, 0);

  return (
    <table className="w-full border-collapse text-center">
      {title && (
        <thead>
          <tr>
            <th colSpan={3} className="border border-black p-1 text-left uppercase">{title}</th>
          </tr>
        </thead>
      )}
      <tbody>
        {values.map(([label, key, value]) => {
          const count = countFor(denominations, key);
          return (
            <tr key={key}>
              <td className="border border-black p-1">{count || ''}</td>
              <td className="border border-black p-1">{label}</td>
              <td className="border border-black p-1">{count ? formatMoney(count * value) : ''}</td>
            </tr>
          );
        })}
        <tr className="font-bold">
          <td colSpan={2} className="border border-black p-1 text-right">Sous-total</td>
          <td className="border border-black p-1">{formatMoney(subtotal)}</td>
        </tr>
      </tbody>
    </table>
  );
};

const Signature: React.FC<{ depositor: string; date: string }> = ({ depositor, date }) => (
  <div className="grid grid-cols-2 gap-6 pt-3">
    <div className="min-h-16 border-t border-black pt-1">
      <div>Date : {date}</div>
    </div>
    <div className="min-h-16 border-t border-black pt-1">
      Signature du déposant {depositor && `· ${depositor}`}
    </div>
  </div>
);

export const BankDepositSlipLayouts: React.FC<BankDepositSlipLayoutsProps> = (props) => {
  const {
    layout,
    bankName,
    slipNumber,
    date,
    accountNumber,
    accountHolder,
    accountAddress,
    depositorName,
    depositorAddress,
    depositorPhone,
    amount,
    provenance,
    denominations,
  } = props;

  const totalBills = bills.reduce(
    (sum, [, key, value]) => sum + countFor(denominations, key) * value,
    0
  );
  const totalCoins = coins.reduce(
    (sum, [, key, value]) => sum + countFor(denominations, key) * value,
    0
  );

  if (layout === 'uba') {
    return (
      <div className="bank-slip-print w-full max-w-[820px] bg-white border border-gray-400 p-6 text-black text-xs space-y-4">
        <header className="flex items-start justify-between border-b-2 border-red-700 pb-3">
          <div>
            <div className="text-xl font-black text-red-700">UBA</div>
            <div className="font-bold">United Bank for Africa</div>
          </div>
          <div className="text-right font-mono font-bold">{slipNumber}</div>
        </header>
        <h1 className="text-center text-base font-black uppercase">Versement d’espèces</h1>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Intitulé de compte :" value={accountHolder} />
          <Field label="Numéro de compte :" value={accountNumber} />
          <Field label="Nom du déposant :" value={depositorName} />
          <Field label="Téléphone du déposant :" value={depositorPhone} />
        </div>
        <PlainDenominationTable denominations={denominations} values={[...bills, ...coins.slice(2)]} />
        <div className="text-right font-black">TOTAL : {formatMoney(amount)} FCFA</div>
        <AmountWords amount={amount} />
        <Signature depositor={depositorName} date={date} />
      </div>
    );
  }

  if (layout === 'ecobank') {
    return (
      <div className="bank-slip-print w-full max-w-[820px] bg-white border border-red-700 p-6 text-black text-xs space-y-3">
        <header className="grid grid-cols-2 gap-4 text-red-700">
          <div className="text-center font-black uppercase">Versement espèces<br />Cash deposit</div>
          <div className="text-right font-black text-lg">Ecobank</div>
        </header>
        <div className="text-right text-[10px] uppercase font-bold">Réservé à la banque</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Field label="Date :" value={date} />
          <Field label="Code banque / guichet / clé RIB :" />
          <Field label="N° du compte :" value={accountNumber} />
          <Field label="Titulaire du compte :" value={accountHolder} />
          <Field label="Nom du déposant :" value={depositorName} />
          <Field label="Téléphone :" value={depositorPhone} />
          <Field label="Adresse :" value={depositorAddress || accountAddress} className="col-span-2" />
        </div>
        <AmountWords amount={amount} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-bold uppercase text-red-700 mb-1">Billets</div>
            <PlainDenominationTable denominations={denominations} values={[...bills]} />
          </div>
          <div>
            <div className="font-bold uppercase text-red-700 mb-1">Pièces</div>
            <PlainDenominationTable denominations={denominations} values={ecobankCoins} />
          </div>
        </div>
        <div className="text-right font-black">TOTAL : {formatMoney(amount)} FCFA</div>
        <Signature depositor={depositorName} date={date} />
      </div>
    );
  }

  if (layout === 'bsca') {
    return (
      <div className="bank-slip-print w-full max-w-[820px] bg-white border border-gray-500 p-6 text-black text-xs space-y-3">
        <header className="text-center border-b border-gray-500 pb-2">
          <div className="text-xl font-black text-[#8B3A2D]">BSCA Bank</div>
          <div className="font-semibold">Banque Sino-Congolaise pour l’Afrique</div>
          <div className="font-bold uppercase mt-2">Versement espèces</div>
        </header>
        <div className="grid grid-cols-12 gap-1">
          <Field label="Banque :" className="col-span-3" />
          <Field label="Agence :" className="col-span-3" />
          <Field label="Numéro de compte :" value={accountNumber} className="col-span-5" />
          <Field label="Clé :" className="col-span-1" />
        </div>
        <Field label="Intitulé du compte :" value={accountHolder} />
        <Field label="Adresse :" value={accountAddress} />
        <Field label="Téléphone :" value={depositorPhone} />
        <AmountWords amount={amount} />
        <div className="grid grid-cols-2 gap-4">
          <DetailedDenominationTable denominations={denominations} values={[...bills]} title="Billets" />
          <DetailedDenominationTable denominations={denominations} values={[...coins]} title="Pièces" />
        </div>
        <div className="flex justify-between border-t-2 border-black pt-2 font-black">
          <span>Total billets : {formatMoney(totalBills)}</span>
          <span>Total pièces : {formatMoney(totalCoins)}</span>
          <span>Total : {formatMoney(amount)} FCFA</span>
        </div>
        <p className="border border-gray-500 p-2 text-[10px] leading-relaxed">
          Le déposant certifie que les fonds déposés ont une origine licite et ne sont pas destinés
          au financement d’activités illicites.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date :" value={date} />
          <Field label="Nom et signature :" value={depositorName} />
          <Field label="Provenance des fonds :" value={provenance} />
        </div>
      </div>
    );
  }

  return (
    <div className="bank-slip-print w-full max-w-[820px] bg-white border border-gray-500 p-6 text-black text-xs space-y-3">
      <header className="flex justify-between border-b border-gray-400 pb-2">
        <div>
          <div className="text-xl font-black text-[#174579]">BANK OF AFRICA</div>
          <div className="font-bold">BMCE Group</div>
        </div>
        <div className="text-right font-black uppercase">Fiche de versement</div>
      </header>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Field label="Agence :" />
        <Field label="Date :" value={date} />
        <Field label="Compte N° :" value={accountNumber} className="col-span-2" />
        <Field label="Nom(s) et prénom(s) du client :" value={accountHolder} className="col-span-2" />
        <Field label="Adresse :" value={accountAddress} />
        <Field label="Quartier / Ville / Pays :" />
        <Field label="Nom(s) et prénom(s) du déposant :" value={depositorName} className="col-span-2" />
        <Field label="Adresse du déposant :" value={depositorAddress} />
        <Field label="Téléphone :" value={depositorPhone} />
        <Field label="Nature et numéro de la pièce d’identité :" className="col-span-2" />
        <Field label="Date de délivrance / Relation d’affaires :" className="col-span-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <DetailedDenominationTable denominations={denominations} values={[...bills]} title="Billets" />
        <DetailedDenominationTable denominations={denominations} values={[...coins]} title="Pièces" />
      </div>
      <div className="text-right font-black">TOTAL : {formatMoney(amount)} FCFA</div>
      <AmountWords amount={amount} />
      <p className="border border-gray-500 p-2 text-[10px] leading-relaxed">
        Le déposant certifie l’origine licite des fonds déposés et s’engage à fournir toute
        information complémentaire demandée par la banque.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Provenance des fonds :" value={provenance} />
        <Field label="Signature du déposant :" value={depositorName} />
      </div>
      <div className="text-right">{bankName} · Référence {slipNumber}</div>
    </div>
  );
};
