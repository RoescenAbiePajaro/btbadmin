import React from 'react';
import { FiUsers, FiBook, FiHome } from 'react-icons/fi';

export default function OverviewTab({ statistics }) {
  return (
    <div className="space-y-8">
      {/* Platform Metrics */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 text-white">Platform Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FiUsers className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">User Growth</p>
                <p className="text-xl font-bold text-white">
                  {statistics?.users?.total || 0} Users
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <FiBook className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Class Engagement</p>
                <p className="text-xl font-bold text-white">
                  {statistics?.classes?.active || 0} Active Classes
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FiHome className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Schools Created</p>
                <p className="text-xl font-bold text-white">
                  {statistics?.schools?.total || 0} Schools
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
