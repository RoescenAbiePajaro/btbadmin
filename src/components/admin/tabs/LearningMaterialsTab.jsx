import React from 'react';
import LearningMaterialsComponent from '../LearningMaterialsComponent.jsx';

export default function LearningMaterialsTab({
  materialSearch,
  setMaterialSearch,
  educatorSharedFiles,
  educatorClassSummary,
  educatorUsers,
  classCodes,
  getSchoolName,
  formatFileSize
}) {
  return (
    <LearningMaterialsComponent
      materialSearch={materialSearch}
      setMaterialSearch={setMaterialSearch}
      educatorSharedFiles={educatorSharedFiles}
      educatorClassSummary={educatorClassSummary}
      educatorUsers={educatorUsers}
      classCodes={classCodes}
      getSchoolName={getSchoolName}
      formatFileSize={formatFileSize}
    />
  );
}
