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
}: ReportViewNavProps<T>) => (
  <nav className="print-hide -mx-4 overflow-x-auto px-4" aria-label="Report sections">
    <div className="grid min-w-max auto-cols-[9.5rem] grid-flow-col gap-2 rounded-3xl border border-brand-gray/10 bg-brand-gray/5 p-2 md:min-w-0 md:grid-flow-row md:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
      {options.map(option => {
        const isActive = option.id === activeView;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal/50 ${
              isActive
                ? 'border-brand-teal/50 bg-brand-teal text-brand-bg shadow-lg shadow-brand-teal/10'
                : 'border-transparent bg-brand-bg/70 text-brand-text-secondary hover:border-brand-teal/25 hover:text-brand-text'
            }`}
            aria-pressed={isActive}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-brand-bg/15' : 'bg-brand-teal/10 text-brand-teal'}`}>
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide">{option.label}</span>
              <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-brand-bg/75' : 'text-brand-text-secondary'}`}>
                {option.detail}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export const ReportViewSection: React.FC<{
  active: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ active, children, className = '' }) => (
  <div className={`${active ? 'block' : 'hidden print:block'} ${className}`}>
    {children}
  </div>
);
