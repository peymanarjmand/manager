import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
  Plugin
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WeightRecord, BloodPressureReading, HealthProfile } from '../../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartContainerProps {
  title: string;
  data: WeightRecord[] | BloodPressureReading[];
  type: 'weight' | 'blood-pressure';
  color: string;
  healthProfile?: HealthProfile | null;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ title, data, type, color, healthProfile }) => {
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  const prepareChartData = (): ChartData<'line'> => {
    if (type === 'weight') {
      const weightData = data as WeightRecord[];
      const sortedData = [...weightData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        labels: sortedData.map(record => 
          new Date(record.timestamp).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            label: 'وزن (کیلوگرم)',
            data: sortedData.map(record => record.weight),
            borderColor: color,
            backgroundColor: `${color}20`,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ]
      };
    } else {
      const bpData = data as BloodPressureReading[];
      const sortedData = [...bpData].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        labels: sortedData.map(record => 
          new Date(record.timestamp).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })
        ),
        datasets: [
          {
            label: 'سیستولیک',
            data: sortedData.map(record => record.systolic),
            borderColor: '#ef4444',
            backgroundColor: '#ef444420',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'دیاستولیک',
            data: sortedData.map(record => record.diastolic),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f620',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ]
      };
    }
  };

  const getChartOptions = (): ChartOptions<'line'> => {
    const baseOptions: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: '#e2e8f0',
            font: {
              family: 'IranSans',
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f1f5f9',
          bodyColor: '#e2e8f0',
          borderColor: '#475569',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          titleFont: {
            family: 'IranSans',
            size: 14
          },
          bodyFont: {
            family: 'IranSans',
            size: 12
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'IranSans',
              size: 11
            }
          }
        },
        y: {
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'IranSans',
              size: 11
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };

    if (type === 'blood-pressure') {
      const plugins = baseOptions.plugins as any;
      plugins.annotation = {
        annotations: {
          normalSystolic: {
            type: 'line',
            yMin: 120,
            yMax: 120,
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'نرمال سیستولیک',
              enabled: true,
              position: 'end',
              backgroundColor: '#10b981',
              font: {
                family: 'IranSans',
                size: 10
              }
            }
          },
          normalDiastolic: {
            type: 'line',
            yMin: 80,
            yMax: 80,
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              content: 'نرمال دیاستولیک',
              enabled: true,
              position: 'end',
              backgroundColor: '#10b981',
              font: {
                family: 'IranSans',
                size: 10
              }
            }
          }
        }
      };
    }

    return baseOptions;
  };

  const chartData = prepareChartData();
  const options = getChartOptions();
  const toNumber = (value: any) => {
    if (typeof value === 'number') return value;
    if (value && typeof value.y === 'number') return value.y;
    return Number(value) || 0;
  };

  // Check if there's no data
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-slate-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">هنوز داده‌ای ثبت نشده</p>
            <p className="text-slate-500 text-xs mt-1">با ثبت داده‌های خود، نمودار اینجا نمایش داده می‌شود</p>
          </div>
        </div>
      </div>
    );
  }

  // Add reference lines for blood pressure
  if (type === 'blood-pressure' && chartRef.current) {
    const chart = chartRef.current;
    if (chart.options.plugins?.annotation) {
      chart.update();
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <div className="flex items-center space-x-2">
          {type === 'weight' && (
            <span className="text-xs text-slate-400">
              {chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data ? chartData.datasets[0].data.length : 0} ثبت
            </span>
          )}
          {type === 'blood-pressure' && (
            <span className="text-xs text-slate-400">
              {chartData.datasets && chartData.datasets[0] && chartData.datasets[0].data ? chartData.datasets[0].data.length : 0} ثبت
            </span>
          )}
        </div>
      </div>
      
      {chartData.labels && chartData.labels.length > 0 ? (
        <div className="h-64">
          <Line 
            ref={chartRef}
            data={chartData} 
            options={options}
          />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="bg-slate-700/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">هنوز داده‌ای ثبت نشده</p>
            <p className="text-slate-500 text-xs mt-1">با ثبت داده‌های خود، نمودار اینجا نمایش داده می‌شود</p>
          </div>
        </div>
      )}
      
      {chartData.labels && chartData.labels.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {type === 'weight' && healthProfile && (
              <div className="text-center">
                <p className="text-slate-400">هدف وزنی</p>
                <p className="text-slate-200 font-medium">
                  {healthProfile.targetWeight ? `${healthProfile.targetWeight} کیلوگرم` : 'تنظیم نشده'}
                </p>
              </div>
            )}
            {type === 'blood-pressure' && (
              <div className="text-center">
                <p className="text-slate-400">میانگین</p>
                <p className="text-slate-200 font-medium">
                  {chartData.datasets.length > 0 && chartData.datasets[0].data.length > 0 && (
                    `${Math.round(chartData.datasets[0].data.reduce((a, b) => toNumber(a) + toNumber(b), 0) / chartData.datasets[0].data.length)}/${
                      chartData.datasets.length > 1 && chartData.datasets[1].data.length > 0 ? Math.round(chartData.datasets[1].data.reduce((a, b) => toNumber(a) + toNumber(b), 0) / chartData.datasets[1].data.length) : 0
                    }`
                  )}
                </p>
              </div>
            )}
            <div className="text-center">
              <p className="text-slate-400">تغییرات</p>
              <p className={`font-medium ${
                chartData.datasets.length > 0 && chartData.datasets[0].data.length >= 2
                  ? chartData.datasets[0].data[chartData.datasets[0].data.length - 1] > chartData.datasets[0].data[0]
                    ? 'text-emerald-400'
                    : 'text-red-400'
                  : 'text-slate-400'
              }`}>
                {chartData.datasets.length > 0 && chartData.datasets[0].data.length >= 2
                  ? `${((toNumber(chartData.datasets[0].data[chartData.datasets[0].data.length - 1]) - toNumber(chartData.datasets[0].data[0])) / toNumber(chartData.datasets[0].data[0]) * 100).toFixed(1)}%`
                  : '0%'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
