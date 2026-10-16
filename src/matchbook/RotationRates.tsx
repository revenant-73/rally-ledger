import type { Ratio, Rotation, SetSummary } from './matchbookModel';

const Rate = ({ rate }: { rate: Ratio }) => (
  <>
    <span className="block text-lg font-black tabular-nums">{rate.attempts ? rate.label : '—'}</span>
    <span className="block text-xs font-bold text-slate-600">{rate.made}/{rate.attempts}</span>
  </>
);

export const RotationRates = ({ summary, currentRotation }: { summary: SetSummary; currentRotation?: Rotation }) => (
  <details className="rounded border border-slate-300 bg-white text-slate-950">
    <summary className="min-h-12 cursor-pointer rounded p-3 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
      Rotation sideout &amp; breakpoint
      <span className="mt-1 block pl-4 text-xs font-bold text-slate-600">
        {currentRotation ? `Current set · R${currentRotation} now · ` : ''}R1–R6
      </span>
    </summary>
    <div className="border-t border-slate-200 p-3">
      <table className="w-full table-fixed text-center">
        <caption className="sr-only">Sideout and breakpoint percentages by rotation, with wins and attempts</caption>
        <thead className="text-xs font-black text-slate-600">
          <tr>
            <th scope="col" className="w-1/3 pb-2 text-left">Rotation</th>
            <th scope="col" className="pb-2">Sideout %</th>
            <th scope="col" className="pb-2">Breakpoint %</th>
          </tr>
        </thead>
        <tbody>
          {summary.rotations.map((row) => (
            <tr key={row.rotation} className={`border-t border-slate-200 ${currentRotation === row.rotation ? 'bg-teal-100' : ''}`}>
              <th scope="row" className="py-1.5 pl-2 text-left text-sm font-black">
                R{row.rotation}{' '}
                {currentRotation === row.rotation ? <span className="block text-xs text-teal-800">Now</span> : null}
              </th>
              <td className="py-1.5"><Rate rate={row.sideout} /></td>
              <td className="py-1.5"><Rate rate={row.breakpoint} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-400 bg-slate-100">
          <tr>
            <th scope="row" className="py-2 pl-2 text-left text-sm font-black">Team</th>
            <td className="py-2"><Rate rate={summary.team.sideout} /></td>
            <td className="py-2"><Rate rate={summary.team.breakpoint} /></td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-xs leading-snug text-slate-600">
        Sideout: points won while receiving. Breakpoint: points won while serving.
        Counts show wins/attempts from tracked rallies; undone rallies and score adjustments are excluded.
        No attempts shows —. Small samples can swing quickly. Rotation slots combine all lineups in this scope.
      </p>
    </div>
  </details>
);
