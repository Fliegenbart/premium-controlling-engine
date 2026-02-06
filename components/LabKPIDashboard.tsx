'use client';

import { TrendingUp, TrendingDown, Minus, Users, FlaskConical, DollarSign, Activity } from 'lucide-react';
import { LabKPIs } from '@/lib/types';

interface LabKPIDashboardProps {
  kpis: LabKPIs;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

interface KPICardProps {
  title: string;
  icon: React.ReactNode;
  valuePrev: number;
  valueCurr: number;
  format: 'currency' | 'percent' | 'number';
  invertTrend?: boolean; // For costs, lower is better
}

function KPICard({ title, icon, valuePrev, valueCurr, format, invertTrend }: KPICardProps) {
  const delta = valueCurr - valuePrev;
  const deltaPct = valuePrev !== 0 ? (delta / valuePrev) * 100 : 0;

  const formatValue = (v: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(v);
      case 'percent':
        return formatPercent(v);
      case 'number':
        return v.toLocaleString('de-DE');
    }
  };

  // Determine if the change is positive (good)
  const isPositiveChange = invertTrend ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(deltaPct) < 1;

  return (
    <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{title}</span>
        <span className="text-blue-400">{icon}</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{formatValue(valueCurr)}</p>
          <p className="text-xs text-gray-500 mt-1">VJ: {formatValue(valuePrev)}</p>
        </div>

        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
          isNeutral
            ? 'bg-gray-500/20 text-gray-400'
            : isPositiveChange
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {isNeutral ? (
            <Minus className="w-3 h-3" />
          ) : delta > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

export function LabKPIDashboard({ kpis }: LabKPIDashboardProps) {
  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl border border-purple-500/20 p-6 mb-8">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-400" />
        Branchen-KPIs
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue */}
        <KPICard
          title="Umsatz"
          icon={<DollarSign className="w-4 h-4" />}
          valuePrev={kpis.revenue_prev}
          valueCurr={kpis.revenue_curr}
          format="currency"
          invertTrend={false}
        />

        {/* Personnel Ratio */}
        <KPICard
          title="Personalquote"
          icon={<Users className="w-4 h-4" />}
          valuePrev={kpis.personnel_ratio_prev}
          valueCurr={kpis.personnel_ratio_curr}
          format="percent"
          invertTrend={true}
        />

        {/* Reagent Ratio */}
        <KPICard
          title="Materialquote"
          icon={<FlaskConical className="w-4 h-4" />}
          valuePrev={kpis.reagent_ratio_prev}
          valueCurr={kpis.reagent_ratio_curr}
          format="percent"
          invertTrend={true}
        />

        {/* Cost per Test (if available) */}
        {kpis.cost_per_test_curr !== undefined && kpis.cost_per_test_prev !== undefined ? (
          <KPICard
            title="Kosten/Test"
            icon={<Activity className="w-4 h-4" />}
            valuePrev={kpis.cost_per_test_prev}
            valueCurr={kpis.cost_per_test_curr}
            format="currency"
            invertTrend={true}
          />
        ) : (
          <KPICard
            title="Gesamtkosten"
            icon={<Activity className="w-4 h-4" />}
            valuePrev={kpis.total_costs_prev}
            valueCurr={kpis.total_costs_curr}
            format="currency"
            invertTrend={true}
          />
        )}
      </div>

      {/* Additional Details */}
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Personalkosten</span>
          <p className="text-white font-medium">{formatCurrency(kpis.personnel_costs_curr)}</p>
        </div>
        <div>
          <span className="text-gray-500">Materialkosten</span>
          <p className="text-white font-medium">{formatCurrency(kpis.reagent_costs_curr)}</p>
        </div>
        <div>
          <span className="text-gray-500">Umsatzentwicklung</span>
          <p className={`font-medium ${kpis.revenue_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {kpis.revenue_delta >= 0 ? '+' : ''}{formatCurrency(kpis.revenue_delta)}
          </p>
        </div>
        {kpis.test_count_curr && (
          <div>
            <span className="text-gray-500">Testvolumen</span>
            <p className="text-white font-medium">
              {kpis.test_count_curr.toLocaleString('de-DE')} Tests
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
