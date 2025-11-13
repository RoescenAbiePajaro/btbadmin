import React from 'react';

const AnalyticsStats = ({ filteredClicks, totalClicks }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 min-w-[120px]">
        <p className="text-sm text-gray-200">Filtered Clicks</p>
        <p className="text-xl font-semibold text-white">{filteredClicks}</p>
      </div>
      <div className="bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-700 min-w-[120px]">
        <p className="text-sm text-gray-200">Total Clicks</p>
        <p className="text-xl font-semibold text-white">{totalClicks}</p>
      </div>
    </div>
  );
};

export default AnalyticsStats;