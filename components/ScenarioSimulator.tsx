'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Zap,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnalysisResult } from '@/lib/types';
import {
  createDefaultParameters,
  simulateScenario,
  getPresets,
  ScenarioParameter,
  ScenarioPreset,
} from '@/lib/scenario-engine';

interface ScenarioSimulatorProps {
  analysisResult: AnalysisResult | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export function ScenarioSimulator({ analysisResult }: ScenarioSimulatorProps) {
  const [parameters, setParameters] = useState<ScenarioParameter[]>(
    analysisResult ? createDefaultParameters(analysisResult) : [],
  );

  const [expandedSection, setExpandedSection] = useState<string>('sliders');

  // Memoized scenario result
  const scenarioResult = useMemo(() => {
    if (!analysisResult) return null;
    return simulateScenario(analysisResult, parameters);
  }, [analysisResult, parameters]);

  const presets = useMemo(() => {
    return analysisResult ? getPresets(analysisResult) : [];
  }, [analysisResult]);

  const handleSliderChange = (parameterId: string, newValue: number) => {
    setParameters(prev =>
      prev.map(p => (p.id === parameterId ? { ...p, currentValue: newValue } : p)),
    );
  };

  const handlePresetClick = (preset: ScenarioPreset) => {
    const updatedParams = parameters.map(p => {
      const presetParam = preset.parameters.find(pp => pp.id === p.id);
      if (presetParam && presetParam.value > 0) {
        return { ...p, currentValue: presetParam.value };
      }
      return p;
    });
    setParameters(updatedParams);
  };

  const handleReset = () => {
    setParameters(prev => prev.map(p => ({ ...p, currentValue: p.baseValue })));
  };

  if (!analysisResult || !scenarioResult) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <p className="text-gray-600">Keine Analysedaten verfügbar für Szenario-Simulation</p>
      </div>
    );
  }

  const hasChanges = parameters.some(p => p.currentValue !== p.baseValue);
  const isPositive = scenarioResult.projectedResult.resultDelta >= 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔮</span>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Szenario-Simulation</h2>
              <p className="text-sm text-gray-600">Interaktive Was-wäre-wenn Analyse mit Reglern</p>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className="px-3 py-2 rounded-full text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              title={preset.description}
            >
              {preset.icon} {preset.name}
            </button>
          ))}
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-full text-sm font-medium bg-white border border-red-300 hover:bg-red-50 text-red-700 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={14} /> Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Results KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Umsatz Prognose</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(scenarioResult.projectedResult.revenue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(scenarioResult.projectedResult.revenue - (analysisResult?.summary.erloese_curr || 0))}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ausgaben Prognose</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(scenarioResult.projectedResult.expenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(scenarioResult.projectedResult.expenses - (analysisResult?.summary.aufwendungen_curr || 0))}
          </p>
        </div>

        <div
          className={`bg-white rounded-lg border-2 p-4 ${
            isPositive ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}
        >
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Ergebnis Prognose</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(scenarioResult.projectedResult.result)}
          </p>
          <p className={`text-xs font-semibold mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}
            {formatCurrency(scenarioResult.projectedResult.resultDelta)} (
            {formatPercent(scenarioResult.projectedResult.resultDeltaPct)})
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Gewinnmarge</p>
          <p className={`text-2xl font-bold ${scenarioResult.projectedResult.marginPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(scenarioResult.projectedResult.marginPct)}
          </p>
          <p className="text-xs text-gray-500 mt-1">(Ergebnis / Umsatz)</p>
        </div>
      </div>

      {/* Collapsible Sliders Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <button
          onClick={() => setExpandedSection(expandedSection === 'sliders' ? '' : 'sliders')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" /> Parameter-Regler
          </h3>
          {expandedSection === 'sliders' ? <ChevronUp /> : <ChevronDown />}
        </button>

        {expandedSection === 'sliders' && (
          <div className="border-t border-gray-200 p-4 space-y-6">
            {parameters.map(param => {
              const percentChange = ((param.currentValue - param.baseValue) / param.baseValue) * 100;
              const isRevenueParam = param.category === 'revenue';
              const color = percentChange > 0 ? (isRevenueParam ? 'green' : 'red') : percentChange < 0 ? (isRevenueParam ? 'red' : 'green') : 'gray';

              return (
                <div key={param.id} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-gray-900">{param.name}</label>
                      <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className={`text-sm font-bold text-${color}-600`}>
                        {param.unit === 'EUR'
                          ? formatCurrency(param.currentValue)
                          : param.unit === 'percent'
                            ? formatPercent(param.currentValue)
                            : param.currentValue.toFixed(0)}
                      </p>
                      {percentChange !== 0 && (
                        <p
                          className={`text-xs font-semibold ${
                            percentChange > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {percentChange > 0 ? '+' : ''}
                          {formatPercent(percentChange)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 w-20 text-right">
                      {param.unit === 'EUR'
                        ? formatCurrency(param.minValue)
                        : param.unit === 'percent'
                          ? formatPercent(param.minValue)
                          : param.minValue.toFixed(0)}
                    </span>
                    <input
                      type="range"
                      min={param.minValue}
                      max={param.maxValue}
                      step={param.step}
                      value={param.currentValue}
                      onChange={e => handleSliderChange(param.id, parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-500 w-20">
                      {param.unit === 'EUR'
                        ? formatCurrency(param.maxValue)
                        : param.unit === 'percent'
                          ? formatPercent(param.maxValue)
                          : param.maxValue.toFixed(0)}
                    </span>
                  </div>

                  {/* Base value indicator */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Basis: {param.unit === 'EUR' ? formatCurrency(param.baseValue) : param.baseValue.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Break-Even Analysis */}
      {scenarioResult.breakEvenAnalysis && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-blue-600" /> Break-Even Analyse
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Zusätzlich erforderlicher Umsatz</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(scenarioResult.breakEvenAnalysis.revenueNeeded)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Erforderliche Kostensenkung</p>
              <p className="text-lg font-bold text-orange-600">
                {formatCurrency(scenarioResult.breakEvenAnalysis.costReductionNeeded)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Distanz zum Break-Even</p>
              <p className={`text-lg font-bold ${scenarioResult.breakEvenAnalysis.currentDistance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(scenarioResult.breakEvenAnalysis.currentDistance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sensitivity Analysis */}
      {scenarioResult.sensitivityRanking.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'sensitivity' ? '' : 'sensitivity')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" /> Sensitivitätsanalyse
            </h3>
            {expandedSection === 'sensitivity' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'sensitivity' && (
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Auswirkung auf Ergebnis pro 1% Parameteränderung
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioResult.sensitivityRanking} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="parameterName" type="category" width={150} />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Bar dataKey="impactPerPercent" fill="#3b82f6" radius={[0, 8, 8, 0]}>
                    {scenarioResult.sensitivityRanking.map((item, index) => (
                      <Cell key={`cell-${index}`} fill={item.impactPerPercent >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Account Impacts */}
      {scenarioResult.accountImpacts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <button
            onClick={() => setExpandedSection(expandedSection === 'impacts' ? '' : 'impacts')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-200"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign size={20} className="text-green-500" /> Kontenauswirkungen
            </h3>
            {expandedSection === 'impacts' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'impacts' && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Konto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Kontoname</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Basis</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Prognose</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Delta</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">%</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarioResult.accountImpacts.slice(0, 10).map(impact => (
                    <tr key={impact.account} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-mono">{impact.account}</td>
                      <td className="py-3 px-4 text-gray-700">{impact.account_name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(impact.baseline)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {formatCurrency(impact.projected)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${impact.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {impact.delta >= 0 ? '+' : ''}
                        {formatCurrency(impact.delta)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${impact.deltaPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {impact.deltaPct >= 0 ? '+' : ''}
                        {formatPercent(impact.deltaPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {scenarioResult.accountImpacts.length > 10 && (
                <p className="text-xs text-gray-500 mt-4">
                  Weitere {scenarioResult.accountImpacts.length - 10} Konten ausgeblendet
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
