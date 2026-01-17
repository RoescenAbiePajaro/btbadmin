import React from 'react';
import { FiUsers, FiSearch } from 'react-icons/fi';
import ExportUsers from './ExportComponents.jsx';

export default function UsersTabComponent({
  filteredData,
  userSearch,
  setUserSearch,
  filters,
  handleFilterChange,
  resetFilters,
  deriveUserSchool,
  getSchoolName,
  educatorClassSummary,
  classCodes
}) {
  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
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
      
      {/* User Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">User Management</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Simple Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.role || ''}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="educator">Educator</option>
                <option value="admin">Admin</option>
              </select>
              
              <select
                value={filters.sortOrder || 'newest'}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="a-z">A to Z</option>
                <option value="z-a">Z to A</option>
              </select>
              
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                placeholder="Start Date"
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                placeholder="End Date"
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              
              <button
                onClick={resetFilters}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white"
              >
                Clear
              </button>
            </div>
            
            {/* Export Button */}
            <ExportUsers filteredData={filteredData} filters={filters} deriveUserSchool={deriveUserSchool} />
          </div>
        </div>
        
        {/* Active Filters Display */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.role && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-sm">
              Role: {filters.role}
            </span>
          )}
          {filters.sortOrder && filters.sortOrder !== 'newest' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
              Sort: {
                filters.sortOrder === 'oldest' ? 'Oldest First' : 
                filters.sortOrder === 'a-z' ? 'A to Z' : 
                'Z to A'
              }
            </span>
          )}
          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
              Date: {filters.startDate || 'Any'} to {filters.endDate || 'Any'}
            </span>
          )}
        </div>
        
        {/* User Table Content */}
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
                {(() => {
                  // Get users from filteredData
                  let users = filteredData.data || [];
                  
                  // Apply text search filtering
                  if (userSearch) {
                    users = users.filter(user => {
                      const searchText = [
                        user.fullName || '',
                        user.email || '',
                        user.role || '',
                        deriveUserSchool(user),
                        user.isActive ? 'active' : 'inactive',
                        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
                      ].join(' ').toLowerCase();
                      return searchText.includes(userSearch.toLowerCase());
                    });
                  }
                  
                  // Apply role filter
                  if (filters.role) {
                    users = users.filter(user => user.role === filters.role);
                  }
                  
                  // Apply sorting
                  users.sort((a, b) => {
                    const sortOrder = filters.sortOrder || 'newest';
                    switch (sortOrder) {
                      case 'newest':
                        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                      case 'oldest':
                        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                      case 'a-z':
                        return (a.fullName || '').localeCompare(b.fullName || '');
                      case 'z-a':
                        return (b.fullName || '').localeCompare(a.fullName || '');
                      default:
                        return 0;
                    }
                  });
                  
                  // Apply date filtering
                  if (filters.startDate || filters.endDate) {
                    users = users.filter(user => {
                      if (!user.createdAt) return false;
                      const userDate = new Date(user.createdAt);
                      const startDate = filters.startDate ? new Date(filters.startDate) : null;
                      const endDate = filters.endDate ? new Date(filters.endDate) : null;
                      
                      if (startDate && userDate < startDate) return false;
                      if (endDate && userDate > endDate) return false;
                      return true;
                    });
                  }
                  
                  return users.length > 0 ? (
                    users.map((user, index) => {
                      let userSchool = user.school;
                      
                      if (user.role === 'educator') {
                        if (educatorClassSummary?.[user._id]?.school) {
                          userSchool = educatorClassSummary[user._id].school;
                        } else if (classCodes.length > 0) {
                          const educatorClasses = classCodes.filter(cls => 
                            cls.educator?._id === user._id || 
                            cls.educatorId === user._id
                          );
                          if (educatorClasses.length > 0) {
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
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <FiUsers className="w-12 h-12 text-gray-600 mb-3" />
                          <p>No users found matching your filters</p>
                          {(userSearch || filters.role || filters.startDate || filters.endDate) && (
                            <button
                              onClick={() => {
                                setUserSearch('');
                                resetFilters();
                              }}
                              className="mt-2 text-violet-400 hover:text-violet-300 text-sm"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
