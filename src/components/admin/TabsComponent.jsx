import React from 'react';
import {
  FiHome, FiUsers, FiBook, FiActivity, 
  FiMessageSquare, FiBarChart2
} from 'react-icons/fi';

export default function TabsComponent({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FiHome /> },
    { id: 'users', label: 'Users', icon: <FiUsers /> },
    { id: 'classes', label: 'Classes', icon: <FiBook /> },
    { id: 'activities', label: 'Learning Materials', icon: <FiActivity /> },
    { id: 'feedback', label: 'Feedback', icon: <FiMessageSquare /> },
    { id: 'charts', label: 'Charts', icon: <FiBarChart2 /> }
  ];

  return (
    <div className="mb-6 border-b border-gray-800">
      <div className="flex space-x-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-4 flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-b-2 border-violet-500 text-violet-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
