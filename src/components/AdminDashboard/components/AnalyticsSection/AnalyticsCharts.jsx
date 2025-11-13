import React from 'react';
import { Bar, Pie } from 'react-chartjs-2';

const AnalyticsCharts = ({ analyticsData, analyticsLoading, total }) => {
  const getChartData = () => {
    const buttonCounts = analyticsData.reduce((acc, click) => {
      acc[click.button] = (acc[click.button] || 0) + 1;
      return acc;
    }, {});

    const colors = [
      'rgba(99, 102, 241, 0.6)',
      'rgba(220, 38, 38, 0.6)',
      'rgba(5, 150, 105, 0.6)',
      'rgba(202, 138, 4, 0.6)',
      'rgba(217, 70, 239, 0.6)',
      'rgba(20, 184, 166, 0.6)',
      'rgba(239, 68, 68, 0.6)',
    ];

    return {
      labels: Object.keys(buttonCounts),
      datasets: [
        {
          label: 'Clicks per Button',
          data: Object.values(buttonCounts),
          backgroundColor: colors.slice(0, Object.keys(buttonCounts).length),
          borderColor: colors.map(color => color.replace('0.6', '1')),
          borderWidth: 1
        }
      ]
    };
  };

  if (analyticsLoading) {
    return (
      <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-200">Loading analytics data...</p>
      </div>
    );
  }

  if (analyticsData.length === 0) {
    return (
      <div className="bg-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 text-center">
        <p className="text-gray-200">No data available for analytics</p>
        <p className="text-gray-400 text-sm mt-2">Total clicks in system: {total}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-medium text-white mb-4">Engagements - Bar Chart</h2>
        <div className="bg-gray-800 p-3 sm:p-4 rounded-lg h-64 sm:h-80">
          <Bar
            data={getChartData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  position: 'top',
                  labels: { 
                    color: 'white',
                    font: { size: window.innerWidth < 640 ? 10 : 12 }
                  }
                },
                title: { 
                  display: true, 
                  text: 'Clicks per Button',
                  color: 'white',
                  font: { size: window.innerWidth < 640 ? 14 : 16 }
                }
              },
              scales: {
                y: { 
                  beginAtZero: true, 
                  title: { 
                    display: true, 
                    text: 'Number of Clicks',
                    color: 'white',
                    font: { size: window.innerWidth < 640 ? 10 : 12 }
                  },
                  ticks: { 
                    color: 'white',
                    font: { size: window.innerWidth < 640 ? 10 : 12 }
                  },
                  grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: { 
                  title: { 
                    display: true, 
                    text: 'Button',
                    color: 'white',
                    font: { size: window.innerWidth < 640 ? 10 : 12 }
                  },
                  ticks: { 
                    color: 'white',
                    font: { size: window.innerWidth < 640 ? 10 : 12 },
                    maxRotation: 45,
                    minRotation: 45
                  },
                  grid: { color: 'rgba(255,255,255,0.1)' }
                }
              }
            }}
            height={300}
          />
        </div>
      </div>

      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
        <h2 className="text-lg font-medium text-white mb-4">Click Distribution - Pie Chart</h2>
        <div className="bg-gray-800 p-3 sm:p-4 rounded-lg h-64 sm:h-80">
          <Pie
            data={getChartData()}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  position: window.innerWidth < 640 ? 'bottom' : 'right',
                  labels: { 
                    color: 'white',
                    padding: 15,
                    boxWidth: 12,
                    font: { size: window.innerWidth < 640 ? 10 : 12 }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.raw || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return `${label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }}
            height={300}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCharts;