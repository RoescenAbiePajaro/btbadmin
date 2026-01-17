import React from 'react';
import ClassTabComponent from '../ClassTabComponent.jsx';

export default function ClassesTab({
  filteredData,
  classSearch,
  setClassSearch,
  getSchoolName,
  educatorClassSummary,
  classCodes,
  fetchAllClassCodes,
  fetchEducatorClassSummary,
  fetchEducatorUsers,
  activeTab
}) {
  return (
    <ClassTabComponent
      filteredData={filteredData}
      classSearch={classSearch}
      setClassSearch={setClassSearch}
      getSchoolName={getSchoolName}
      educatorClassSummary={educatorClassSummary}
      classCodes={classCodes}
      fetchAllClassCodes={fetchAllClassCodes}
      fetchEducatorClassSummary={fetchEducatorClassSummary}
      fetchEducatorUsers={fetchEducatorUsers}
      activeTab={activeTab}
    />
  );
}
