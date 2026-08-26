import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { GiftContextReport, GiftContextRow } from '../../utils/reportStats';

interface GiftContextCardProps {
  giftContext: GiftContextReport;
  title?: string;
}

const ContextList: React.FC<{
  title: string;
  rows: GiftContextRow[];
  emptyText: string;
}> = ({ title, rows, emptyText }) => (
  <div className="rounded-2xl border border-brand-gray/10 bg-brand-bg p-4">
    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">{title}</p>
    {rows.length > 0 ? (
      <div className="space-y-2">
        {rows.slice(0, 5).map(row => (
          <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-brand-text">{row.label}</p>
              {row.detail && <p className="text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary">{row.detail}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-brand-red">{row.count}</p>
              <p className="text-[10px] font-bold uppercase text-brand-text-secondary">{row.pct}%</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm font-semibold text-brand-text-secondary">{emptyText}</p>
    )}
  </div>
);

const GiftContextCard: React.FC<GiftContextCardProps> = ({
  giftContext,
  title = 'Team Gift Context',
}) => (
  <section className="rounded-3xl border border-brand-red/15 bg-brand-red/5 p-5">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-red">Practice Design</p>
        <h2 className="mt-1 text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-brand-text-secondary">
          {giftContext.practiceCue}
        </p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
        <AlertTriangle size={20} />
      </div>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-brand-red/15 bg-brand-bg p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Total Gifts</p>
        <p className="mt-2 text-3xl font-black text-brand-red">{giftContext.total}</p>
      </div>
      <div className="rounded-2xl border border-brand-red/15 bg-brand-bg p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Top Pattern</p>
        <p className="mt-2 truncate text-lg font-black text-brand-red">{giftContext.byType[0]?.label ?? 'None'}</p>
      </div>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <ContextList title="By Error Type" rows={giftContext.byType} emptyText="No team gifts by type yet." />
      <ContextList title="Serving State" rows={giftContext.byServingState} emptyText="No serving-state context yet." />
      <ContextList title="Score Phase" rows={giftContext.byScorePhase} emptyText="No score-phase context yet." />
      <ContextList title="Score State" rows={giftContext.byScoreState} emptyText="No score-state context yet." />
      {giftContext.byRotation.length > 0 && (
        <ContextList title="Rotation" rows={giftContext.byRotation} emptyText="No rotation context yet." />
      )}
    </div>
  </section>
);

export default GiftContextCard;
