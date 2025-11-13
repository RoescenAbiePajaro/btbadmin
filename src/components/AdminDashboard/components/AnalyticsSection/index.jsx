import React from 'react';
import AnalyticsCharts from './AnalyticsCharts';
import AnalyticsFilters from './AnalyticsFilters';
import AnalyticsStats from './AnalyticsStats';

const AnalyticsSection = ({
  analyticsData,
  analyticsLoading,
  total,
  fetchData,
  fetchAllClicksForAnalytics
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 mb-4">
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <button 
              onClick={() => {
                fetchData();
                fetchAllClicksForAnalytics();
              }}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors self-start sm:self-center"
              title="Refresh Analytics"
              disabled={analyticsLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <p className="text-gray-200 mb-4">Visual insights into guest interactions</p>
          
          <AnalyticsFilters />
        </div>
        
        <AnalyticsStats 
          filteredClicks={analyticsData.length}
          totalClicks={total}
        />
      </div>

      <AnalyticsCharts 
        analyticsData={analyticsData}
        analyticsLoading={analyticsLoading}
        total={total}
      />
    </div>
  );
};

export default AnalyticsSection;
