import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { ExportUsers } from '../ExportComponents.jsx';

export default function UsersTab({ 
  filteredData, 
  userSearch, 
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  userSortFilter,
  setUserSortFilter,
  getSchoolName,
  educatorClassSummary,
  classCodes
}) {
  // Filter and sort users
  const getFilteredAndSortedUsers = () => {
    if (!filteredData?.data) return [];
    
    let users = [...filteredData.data];
    
    // Apply role filter
    if (userRoleFilter !== 'all') {
      users = users.filter(user => user.role === userRoleFilter);
    }
    
    // Apply search filter
    if (userSearch) {
      const searchText = userSearch.toLowerCase();
      users = users.filter(user => {
        const deriveUserSchool = (user) => {
          let userSchool = user.school;
          if (user.role === 'educator') {
            if (educatorClassSummary?.[user._id]?.school) {
              userSchool = educatorClassSummary[user._id].school;
            } else if (classCodes.length > 0) {
              const educatorClasses = classCodes.filter(cls => cls.educator?._id === user._id || cls.educatorId === user._id);
              if (educatorClasses.length > 0) {
                userSchool = educatorClasses[0]?.school;
              }
            }
          }
          return userSchool ? getSchoolName(userSchool) : 'Not specified';
        };

        const searchableText = [
          user.fullName || '',
          user.email || '',
          user.role || '',
          deriveUserSchool(user),
          user.isActive ? 'active' : 'inactive',
          user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
        ].join(' ').toLowerCase();
        return searchableText.includes(searchText);
      });
    }
    
    // Apply sorting
    users.sort((a, b) => {
      switch (userSortFilter) {
        case 'name-asc':
          return (a.fullName || '').localeCompare(b.fullName || '');
        case 'name-desc':
          return (b.fullName || '').localeCompare(a.fullName || '');
        case 'date-asc':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'date-desc':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });
    
    return users;
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full sm:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users by name, email, role, school..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
      
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-white">User Management</h3>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Role Filter */}
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="educator">Educator</option>
              <option value="admin">Admin</option>
            </select>
            
            {/* Sort Filter */}
            <select
              value={userSortFilter}
              onChange={(e) => setUserSortFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="name-asc">A to Z</option>
              <option value="name-desc">Z to A</option>
              <option value="date-desc">Oldest to Newest</option>
              <option value="date-asc">Newest to Oldest</option>
            </select>
            
            <ExportUsers filteredData={filteredData} />
          </div>
        </div>
        {filteredData ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {getFilteredAndSortedUsers().length > 0 ? (
                  getFilteredAndSortedUsers().map((user, index) => {
                    // Get school for educator from their classes
                    let userSchool = user.school;
                    
                    if (user.role === 'educator') {
                      // Try to get school from educatorClassSummary first
                      if (educatorClassSummary?.[user._id]?.school) {
                        userSchool = educatorClassSummary[user._id].school;
                      } 
                      // If not found, fetch from class codes
                      else if (classCodes.length > 0) {
                        // Find classes created by this educator
                        const educatorClasses = classCodes.filter(cls => 
                          cls.educator?._id === user._id || 
                          cls.educatorId === user._id
                        );
                        
                        if (educatorClasses.length > 0) {
                          // Get the first class's school (assuming all classes belong to same school)
                          userSchool = educatorClasses[0]?.school;
                        }
                      }
                    }
                    
                    return (
                      <tr key={user._id || index} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.fullName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.role === 'educator' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {userSchool ? getSchoolName(userSchool) : 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-400">
                      No user data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
