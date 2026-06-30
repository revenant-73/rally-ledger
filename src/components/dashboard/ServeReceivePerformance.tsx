import React from 'react';
import { Zap, Cloud, Sun, CloudRain } from 'lucide-react';

interface ServeReceivePerformanceProps {
  serveStats: {
    aces: number;
    errors: number;
    inSystem: number;
    outOfSystem: number;
    total: number;
  };
  receiveStats: {
    errors: number;
    overpass: number;
    inSystem: number;
    outOfSystem: number;
    total: number;
  };
  serveMetrics: {
    our: {
      koPct: number;
      servePct: number;
      errors: number;
      topMissers: Array<{ name: string; count: number }>;
    };
    opp: {
      koPct: number;
      servePct: number;
      errors: number;
    };
  };
}

const ServeReceivePerformance: React.FC<ServeReceivePerformanceProps> = ({
  serveStats,
  receiveStats,
  serveMetrics,
}) => {
  return (
    <div className="space-y-4">
      {/* Live Serve Percentages */}
      <div className="grid grid-cols-2 gap-4">
        <div className="px-4 py-3 bg-brand-teal/5 border border-brand-teal/10 rounded-2xl">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-black text-brand-teal uppercase">KO%</span>
            <span className="text-xl font-black text-brand-teal">{serveMetrics.our.koPct}%</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black text-brand-text-secondary uppercase">Serve%</span>
            <span className="text-sm font-bold">{serveMetrics.our.servePct}%</span>
          </div>
          <div className="pt-2 border-t border-brand-teal/10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold text-brand-red uppercase">Misses</span>
              <span className="text-xs font-black text-brand-red">{serveMetrics.our.errors}</span>
            </div>
            {serveMetrics.our.topMissers.map((m, i) => (
              <div key={i} className="flex justify-between text-[10px] opacity-70">
                <span>{m.name}</span>
                <span className="font-bold">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 bg-brand-red/5 border border-brand-red/10 rounded-2xl">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-black text-brand-red uppercase">KO%</span>
            <span className="text-xl font-black text-brand-red">{serveMetrics.opp.koPct}%</span>
          </div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-black text-brand-text-secondary uppercase">Serve%</span>
            <span className="text-sm font-bold">{serveMetrics.opp.servePct}%</span>
          </div>
          <div className="pt-2 border-t border-brand-red/10">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-brand-red uppercase">Misses</span>
              <span className="text-xs font-black text-brand-red">{serveMetrics.opp.errors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Serve & Receive Performance Visual Bars */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-5">
          <h3 className="text-[10px] font-bold text-brand-text-secondary uppercase mb-4 tracking-widest text-center">Serve</h3>
          
          <div className="h-2 w-full bg-brand-gray/10 rounded-full overflow-hidden mb-4 flex">
            <div className="h-full bg-brand-green" style={{ width: `${(serveStats.aces / (serveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-teal" style={{ width: `${(serveStats.inSystem / (serveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-amber" style={{ width: `${(serveStats.outOfSystem / (serveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-red" style={{ width: `${(serveStats.errors / (serveStats.total || 1)) * 100}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-0.5">
                <Zap size={10} className="text-brand-green" />
                <p className="text-lg font-black text-brand-green">{serveStats.aces}</p>
              </div>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Ace</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-0.5">
                <Cloud size={10} className="text-brand-teal" />
                <p className="text-lg font-black text-brand-teal">{serveStats.inSystem}</p>
              </div>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">InSys</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-0.5">
                <Sun size={10} className="text-brand-amber" />
                <p className="text-lg font-black text-brand-amber">{serveStats.outOfSystem}</p>
              </div>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">KO</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-0.5">
                <CloudRain size={10} className="text-brand-red" />
                <p className="text-lg font-black text-brand-red">{serveStats.errors}</p>
              </div>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">Err</p>
            </div>
          </div>
        </div>

        <div className="bg-brand-gray/5 border border-brand-gray/10 rounded-3xl p-5">
          <h3 className="text-[10px] font-bold text-brand-text-secondary uppercase mb-4 tracking-widest text-center">Receive</h3>
          
          <div className="h-2 w-full bg-brand-gray/10 rounded-full overflow-hidden mb-4 flex">
            <div className="h-full bg-brand-green" style={{ width: `${(receiveStats.inSystem / (receiveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-teal" style={{ width: `${(receiveStats.outOfSystem / (receiveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-amber" style={{ width: `${(receiveStats.overpass / (receiveStats.total || 1)) * 100}%` }} />
            <div className="h-full bg-brand-red" style={{ width: `${(receiveStats.errors / (receiveStats.total || 1)) * 100}%` }} />
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex flex-col items-center">
              <p className="text-lg font-black text-brand-green leading-none mb-1">{receiveStats.inSystem}</p>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">3 / IS</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-lg font-black text-brand-teal leading-none mb-1">{receiveStats.outOfSystem}</p>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">2 / KO</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-lg font-black text-brand-amber leading-none mb-1">{receiveStats.overpass}</p>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">1 / OV</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-lg font-black text-brand-red leading-none mb-1">{receiveStats.errors}</p>
              <p className="text-[8px] font-bold text-brand-text-secondary uppercase">0 / ACE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServeReceivePerformance;
