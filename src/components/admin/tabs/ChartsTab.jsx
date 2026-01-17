import React from 'react';
import ChartComponent from '../ChartComponent.jsx';

export default function ChartsTab({
  statistics,
  analyticsData,
  schoolTrends,
  schoolTrendPeriod,
  setSchoolTrendPeriod,
  classTrends,
  classTrendPeriod,
  setClassTrendPeriod,
  timeRange,
  handleTimeRangeChange
}) {
  return (
    <ChartComponent
      statistics={statistics}
      analyticsData={analyticsData}
      schoolTrends={schoolTrends}
      schoolTrendPeriod={schoolTrendPeriod}
      setSchoolTrendPeriod={setSchoolTrendPeriod}
      classTrends={classTrends}
      classTrendPeriod={classTrendPeriod}
      setClassTrendPeriod={setClassTrendPeriod}
      timeRange={timeRange}
      handleTimeRangeChange={handleTimeRangeChange}
    />
  );
}
