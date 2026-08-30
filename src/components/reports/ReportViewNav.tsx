import React from 'react';

export type ReportViewOption<T extends string> = {
  id: T;
  label: string;
  detail: string;
  icon: React.ReactNode;
};

interface ReportViewNavProps<T extends string> {
  activeView: T;
  options: ReportViewOption<T>[];
  onChange: (view: T) => void;
}

export const ReportViewNav = <T extends string,>({
  activeView,
  options,
  onChange,
}: ReportViewNavProps<T>) => {
  const activeOption = options.find(option => option.id === activeView) ?? options[0];

  return (
    <nav className="print-hide rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-4" aria-label="Report sections">
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">
          Report View
        </span>
        <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-brand-teal/25 bg-brand-bg px-4 py-3 focus-within:border-brand-teal/60 focus-within:ring-2 focus-within:ring-brand-teal/20">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal">
            {activeOption?.icon}
          </span>
          <span className="min-w-0">
            <select
              value={activeView}
              onChange={(event) => onChange(event.target.value as T)}
              className="w-full bg-transparent text-base font-black text-brand-text outline-none"
            >
              {options.map(option => (
                <option key={option.id} value={option.id} className="bg-brand-bg text-brand-text">
                  {option.label} - {option.detail}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-brand-text-secondary">
              {activeOption?.detail}
            </span>
          </span>
        </span>
      </label>
    </nav>
  );
};

export const ReportViewSection: React.FC<{
  active: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ active, children, className = '' }) => (
  <div className={`${active ? 'block' : 'hidden print:block'} ${className}`}>
    {children}
  </div>
);
