import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Timer,
  CheckCircle2,
  Calendar,
  Flame,
  Award,
  Filter,
  Activity,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MonthlyPerformanceChart: React.FC = () => {
  const { studySessions, topics, userProfile, isDarkMode } = useApp();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [activeMetric, setActiveMetric] = useState<'all' | 'performance' | 'pomodoro'>('all');

  // Compute 30-day timeline data
  const chartData = useMemo(() => {
    const now = new Date();
    
    if (viewMode === 'daily') {
      // Generate last 30 days
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

        // Sessions on this date
        const daySessions = studySessions.filter((s) => {
          const sDate = new Date(s.timestamp).toISOString().split('T')[0];
          return sDate === dateStr;
        });

        const pomodoroSessions = daySessions.filter((s) => s.type === 'pomodoro');
        const pomodoroMinutes = pomodoroSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalMinutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalHours = Number((totalMinutes / 60).toFixed(1));

        // Pomodoro target: 4 sessions (100 minutes) per day as 100% benchmark
        const pomodoroCycles = pomodoroSessions.length;
        
        // Retention or topic reviews on this day
        const reviewedTopics = topics.filter((t) => t.lastStudiedDate === dateStr);
        const masteredTopics = reviewedTopics.filter(
          (t) => t.status === 'dominado' || t.status === 'revisado' || t.difficulty === 'facil'
        ).length;

        // Calculate Study Performance Score (%)
        let performanceScore = 0;
        if (reviewedTopics.length > 0) {
          performanceScore = Math.round((masteredTopics / reviewedTopics.length) * 100);
        } else if (totalHours > 0) {
          performanceScore = Math.min(100, Math.max(50, Math.round(60 + (totalHours * 10))));
        } else {
          performanceScore = 0;
        }

        // Calculate Pomodoro Consistency Score (%)
        let pomodoroConsistency = 0;
        if (pomodoroCycles > 0) {
          pomodoroConsistency = Math.min(100, Math.round((pomodoroCycles / 4) * 100));
        } else if (totalHours > 0) {
          pomodoroConsistency = Math.min(100, Math.round((totalHours / 3) * 100));
        } else {
          pomodoroConsistency = 0;
        }

        days.push({
          date: dateStr,
          label: dayFormatted,
          desempenho: performanceScore,
          consistenciaPomodoro: pomodoroConsistency,
          ciclosPomodoro: pomodoroCycles,
          horas: totalHours,
        });
      }
      return days;
    } else {
      // Generate last 4 Weeks
      const weeks = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (w * 7 + 6));
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() - w * 7);

        const label = `Semana ${4 - w}`;

        // Sessions in week range
        const weekSessions = studySessions.filter((s) => {
          const sDate = new Date(s.timestamp);
          return sDate >= weekStart && sDate <= weekEnd;
        });

        const pomodoroSessions = weekSessions.filter((s) => s.type === 'pomodoro');
        const totalMinutes = weekSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalHours = Number((totalMinutes / 60).toFixed(1));
        const pomodoroCycles = pomodoroSessions.length;

        const basePerformance = totalHours > 0 || pomodoroCycles > 0 ? Math.min(100, Math.round(60 + totalHours * 5)) : 0;
        const basePomodoroConsistency = pomodoroCycles > 0 ? Math.min(100, Math.round((pomodoroCycles / 20) * 100)) : 0;

        weeks.push({
          date: label,
          label: label,
          desempenho: basePerformance,
          consistenciaPomodoro: basePomodoroConsistency,
          ciclosPomodoro: pomodoroCycles,
          horas: totalHours,
        });
      }
      return weeks;
    }
  }, [studySessions, topics, viewMode]);

  // Aggregate stats - Calculated strictly from real recorded data
  const avgPerformance = useMemo(() => {
    const activeDays = chartData.filter((d) => d.desempenho > 0);
    if (activeDays.length === 0) return 0;
    const sum = activeDays.reduce((acc, d) => acc + d.desempenho, 0);
    return Math.round(sum / activeDays.length);
  }, [chartData]);

  const avgPomodoroConsistency = useMemo(() => {
    const activeDays = chartData.filter((d) => d.consistenciaPomodoro > 0);
    if (activeDays.length === 0) return 0;
    const sum = activeDays.reduce((acc, d) => acc + d.consistenciaPomodoro, 0);
    return Math.round(sum / activeDays.length);
  }, [chartData]);

  const totalPomodoroCyclesMonth = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.ciclosPomodoro, 0);
  }, [chartData]);

  const totalHoursMonth = useMemo(() => {
    return chartData.reduce((acc, d) => acc + d.horas, 0).toFixed(1);
  }, [chartData]);

  const gridColor = isDarkMode ? '#334155' : '#f1f5f9';
  const textColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div
      id="dashboard-monthly-performance-chart"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                Evolução Mensal & Consistência Pomodoro
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Recharts
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento contínuo da eficácia nos estudos e adesão ao ciclo de foco
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric View Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetric === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Ambos
            </button>
            <button
              onClick={() => setActiveMetric('performance')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetric === 'performance'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Desempenho
            </button>
            <button
              onClick={() => setActiveMetric('pomodoro')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetric === 'pomodoro'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Pomodoro
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              30 Dias
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              4 Semanas
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Desempenho Médio
            </span>
            <span className="text-sm font-black text-sky-600 dark:text-sky-400">
              {avgPerformance}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Consistência Pomodoro
            </span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              {avgPomodoroConsistency}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Ciclos Concluídos
            </span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
              {totalPomodoroCyclesMonth} blocos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Horas Acumuladas
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {totalHoursMonth}h no mês
            </span>
          </div>
        </div>
      </div>

      {/* Line Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              interval={viewMode === 'daily' ? 3 : 0}
            />
            <YAxis
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-3.5 shadow-2xl text-xs space-y-2 min-w-[180px]">
                      <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        <span>Data: {label}</span>
                      </p>
                      {payload.map((entry, index) => (
                        <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                          <span className="text-slate-300 font-medium flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            {entry.name}:
                          </span>
                          <span className="font-bold font-mono" style={{ color: entry.color }}>
                            {entry.value}%
                          </span>
                        </div>
                      ))}
                      {payload[0]?.payload?.ciclosPomodoro !== undefined && (
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Sessões Pomodoro:</span>
                          <span className="font-bold text-amber-300 font-mono">
                            {payload[0].payload.ciclosPomodoro} blocos
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
            />

            <ReferenceLine y={80} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Meta de Excelência (80%)', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }} />

            {(activeMetric === 'all' || activeMetric === 'performance') && (
              <Line
                type="monotone"
                dataKey="desempenho"
                name="Evolução do Desempenho"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: viewMode === 'weekly' ? 5 : 2, fill: '#0284c7', strokeWidth: 2, stroke: isDarkMode ? '#0f172a' : '#ffffff' }}
                activeDot={{ r: 7, stroke: '#38bdf8', strokeWidth: 2 }}
                unit="%"
              />
            )}

            {(activeMetric === 'all' || activeMetric === 'pomodoro') && (
              <Line
                type="monotone"
                dataKey="consistenciaPomodoro"
                name="Consistência Pomodoro"
                stroke="#f59e0b"
                strokeWidth={3}
                strokeDasharray={activeMetric === 'all' ? undefined : undefined}
                dot={{ r: viewMode === 'weekly' ? 5 : 2, fill: '#f59e0b', strokeWidth: 2, stroke: isDarkMode ? '#0f172a' : '#ffffff' }}
                activeDot={{ r: 7, stroke: '#fbbf24', strokeWidth: 2 }}
                unit="%"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
