import React from 'react';
import { Lock, Scale, FileText, Cpu } from 'lucide-react';
import { VaultStats, formatGen } from '../utils/helpers';

interface StatsBarProps {
  stats: VaultStats | null;
  loading: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats, loading }) => {
  const cards = [
    {
      label: 'Guarantee Escrow Locked',
      value: stats ? formatGen(stats.total_deposit_locked) : '0.00 GEN',
      icon: Lock,
      color: 'text-ultramarine',
      bg: 'bg-ultramarine-light',
      borderColor: 'border-ultramarine-border',
      description: 'Collateral staked against copyright infringement',
    },
    {
      label: 'Registered IP Vaults',
      value: stats ? stats.total_vaults.toString() : '0',
      icon: FileText,
      color: 'text-ink-900',
      bg: 'bg-linen-100',
      borderColor: 'border-linen-300',
      description: 'Master system prompts & style DNA secured',
    },
    {
      label: 'AI Disputes Adjudicated',
      value: stats ? stats.total_disputes_resolved.toString() : '0',
      icon: Scale,
      color: 'text-crimson',
      bg: 'bg-crimson-light',
      borderColor: 'border-crimson-border',
      description: 'Subjective consensus trials concluded on-chain',
    },
    {
      label: 'Consensus Engine',
      value: 'GenVM Optimistic',
      icon: Cpu,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      description: 'Live web scraping + multi-validator jury',
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-card border border-linen-300 rounded-lg p-5 shadow-subtle flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-medium tracking-wider text-ink-500 uppercase">
                {c.label}
              </span>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${c.bg} ${c.borderColor} border`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-ink-900 tracking-tight">
                {loading ? (
                  <div className="h-7 bg-linen-200 rounded animate-pulse w-24 my-1" />
                ) : (
                  c.value
                )}
              </div>
              <p className="text-[11px] text-ink-500 mt-1 font-sans">
                {c.description}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
};
