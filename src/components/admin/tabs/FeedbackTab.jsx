import React from 'react';
import FeedbackComponent from '../FeedbackComponent.jsx';

export default function FeedbackTab({
  feedbackStats,
  fetchFeedbackStats,
  fetchEducatorClassSummary,
  fetchAllClassCodes,
  fetchEducatorUsers,
  getSchoolName,
  educatorClassSummary,
  classCodes,
  educatorUsers,
  activeTab
}) {
  return (
    <FeedbackComponent
      feedbackStats={feedbackStats}
      feedbackData={[]} // Pass empty array, component will fetch its own
      feedbackLoading={false}
      fetchFeedbackData={() => {}} // Pass empty function, component will use its own
      fetchFeedbackStats={fetchFeedbackStats}
      fetchEducatorClassSummary={fetchEducatorClassSummary}
      fetchAllClassCodes={fetchAllClassCodes}
      fetchEducatorUsers={fetchEducatorUsers}
      getSchoolName={getSchoolName}
      educatorClassSummary={educatorClassSummary}
      classCodes={classCodes}
      educatorUsers={educatorUsers}
      activeTab={activeTab}
    />
  );
}
