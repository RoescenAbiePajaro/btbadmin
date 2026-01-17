// src/components/admin/ClassTabComponent.jsx
import React, { useState, useEffect } from 'react';
import { FiSearch, FiBook, FiUser, FiHome } from 'react-icons/fi';
import { ExportClassesSummary, ExportClassDetails } from './ExportComponents.jsx';

export default function ClassTabComponent({ 
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
  const [educatorClassData, setEducatorClassData] = useState({});
  const [classFilters, setClassFilters] = useState({
    sortBy: 'className-asc',
    startDate: '',
    endDate: ''
  });

  // Fetch class-related data when component mounts or activeTab changes
  useEffect(() => {
    if (activeTab === 'classes') {
      fetchAllClassCodes();
      fetchEducatorClassSummary();
      fetchEducatorUsers();
    }
  }, [activeTab]);

  // Process educator class data for summary table
  useEffect(() => {
    if (filteredData?.data && filteredData.data.length > 0) {
      const educatorData = filteredData.data.reduce((acc, cls) => {
        const educatorId = cls.educator?._id || 'unknown';
        if (!acc[educatorId]) {
          acc[educatorId] = {
            name: cls.educator?.fullName || 'N/A',
            email: cls.educator?.email || 'N/A',
            school: cls.school?.name || 'N/A',
            totalClasses: 0,
            activeClasses: 0,
            totalStudents: 0,
            classes: []
          };
        }
        acc[educatorId].totalClasses += 1;
        if (cls.isActive) {
          acc[educatorId].activeClasses += 1;
        }
        acc[educatorId].totalStudents += cls.students?.length || 0;
        acc[educatorId].classes.push(cls);
        return acc;
      }, {});
      setEducatorClassData(educatorData);
    }
  }, [filteredData]);

  // Filter educator data based on search, date filters, and sorting
  const getFilteredEducatorData = () => {
    let filteredEducators = { ...educatorClassData };
    
    // Apply text search filtering
    if (classSearch) {
      const searchTerm = classSearch.toLowerCase();
      const searchFiltered = {};
      
      Object.entries(educatorClassData).forEach(([educatorId, data]) => {
        const searchText = [
          data.name,
          data.email,
          data.school,
          data.classes?.map(cls => cls.className).join(' '),
          data.classes?.map(cls => cls.classCode).join(' ')
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (searchText.includes(searchTerm)) {
          searchFiltered[educatorId] = data;
        }
      });
      
      filteredEducators = searchFiltered;
    }
    
    // Apply date filtering to educator classes
    if (classFilters.startDate || classFilters.endDate) {
      const dateFiltered = {};
      
      Object.entries(filteredEducators).forEach(([educatorId, data]) => {
        const filteredClasses = data.classes?.filter(cls => {
          const classDate = new Date(cls.createdAt);
          const startDate = classFilters.startDate ? new Date(classFilters.startDate) : null;
          const endDate = classFilters.endDate ? new Date(classFilters.endDate) : null;
          
          if (startDate && classDate < startDate) return false;
          if (endDate && classDate > endDate) return false;
          return true;
        }) || [];
        
        // Only include educator if they have classes after date filtering
        if (filteredClasses.length > 0) {
          dateFiltered[educatorId] = {
            ...data,
            classes: filteredClasses,
            // Recalculate counts based on filtered classes
            totalClasses: filteredClasses.length,
            activeClasses: filteredClasses.filter(cls => cls.isActive).length,
            totalStudents: filteredClasses.reduce((sum, cls) => sum + (cls.students?.length || 0), 0)
          };
        }
      });
      
      filteredEducators = dateFiltered;
    }
    
    // Apply sorting to educators
    const sortedEntries = Object.entries(filteredEducators).sort(([idA, dataA], [idB, dataB]) => {
      switch (classFilters.sortBy) {
        case 'className-asc':
          return dataA.name.localeCompare(dataB.name);
        case 'className-desc':
          return dataB.name.localeCompare(dataA.name);
        case 'newest':
          // Sort by newest class creation date
          const newestA = Math.max(...dataA.classes.map(cls => new Date(cls.createdAt || 0)));
          const newestB = Math.max(...dataB.classes.map(cls => new Date(cls.createdAt || 0)));
          return newestB - newestA;
        case 'oldest':
          // Sort by oldest class creation date
          const oldestA = Math.min(...dataA.classes.map(cls => new Date(cls.createdAt || 0)));
          const oldestB = Math.min(...dataB.classes.map(cls => new Date(cls.createdAt || 0)));
          return oldestA - oldestB;
        default:
          return 0;
      }
    });
    
    // Convert back to object
    return sortedEntries.reduce((acc, [educatorId, data]) => {
      acc[educatorId] = data;
      return acc;
    }, {});
  };

  // Apply all filtering: text search, date filtering, and sorting
  const getFilteredAndSortedClasses = () => {
    let classes = filteredData?.data ? [...filteredData.data] : [];
    
    // Apply text search filtering
    if (classSearch) {
      classes = classes.filter(cls => {
        const searchText = [
          cls.className,
          cls.classCode,
          cls.educator?.fullName,
          cls.course,
          cls.year,
          cls.block,
          cls.description,
          getSchoolName(cls.school)
        ].filter(Boolean).join(' ').toLowerCase();
        return searchText.includes(classSearch.toLowerCase());
      });
    }
    
    // Apply date filtering
    if (classFilters.startDate || classFilters.endDate) {
      classes = classes.filter(cls => {
        const classDate = new Date(cls.createdAt);
        const startDate = classFilters.startDate ? new Date(classFilters.startDate) : null;
        const endDate = classFilters.endDate ? new Date(classFilters.endDate) : null;
        
        if (startDate && classDate < startDate) return false;
        if (endDate && classDate > endDate) return false;
        return true;
      });
    }
    
    // Apply sorting
    classes.sort((a, b) => {
      switch (classFilters.sortBy) {
        case 'className-asc':
          return (a.className || '').localeCompare(b.className || '');
        case 'className-desc':
          return (b.className || '').localeCompare(a.className || '');
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        default:
          return 0;
      }
    });
    
    return classes;
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full sm:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            placeholder="Search classes, educators, courses..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Educator Classes Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Educator Classes Summary</h3>
          <div className="flex items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={classFilters.sortBy}
                onChange={(e) => setClassFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="className-asc">A to Z</option>
                <option value="className-desc">Z to A</option>
                <option value="oldest">Oldest</option>
                <option value="newest">Newest</option>
              </select>
              <input
                type="date"
                value={classFilters.startDate}
                onChange={(e) => setClassFilters(prev => ({ ...prev, startDate: e.target.value }))}
                placeholder="Start Date"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="date"
                value={classFilters.endDate}
                onChange={(e) => setClassFilters(prev => ({ ...prev, endDate: e.target.value }))}
                placeholder="End Date"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={() => setClassFilters({ sortBy: 'className-asc', startDate: '', endDate: '' })}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm"
              >
                Clear
              </button>
            </div>
            <ExportClassesSummary filteredData={filteredData} getSchoolName={getSchoolName} />
          </div>
        </div>

        {filteredData ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <FiUser className="inline mr-1" /> Educator Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <FiBook className="inline mr-1" /> Total Classes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Active Classes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <FiHome className="inline mr-1" /> School
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {Object.keys(getFilteredEducatorData()).length > 0 ? (
                  Object.entries(getFilteredEducatorData()).map(([educatorId, data]) => (
                    <tr key={educatorId} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {data.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {data.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="font-semibold">{data.totalClasses}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                          {data.activeClasses} Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="font-semibold">{data.totalStudents}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {data.classes[0]?.school ? getSchoolName(data.classes[0].school) : 'Not specified'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-400">
                      {classSearch ? 'No educators match your search' : 'No educator class data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading class summary data...</p>
          </div>
        )}
      </div>

      {/* Class Details */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Class Details</h3>
          <ExportClassDetails filteredData={filteredData} getSchoolName={getSchoolName} />
        </div>

        {filteredData ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Class Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Class Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Educator Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total Students
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Block
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Batch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {getFilteredAndSortedClasses().length > 0 ? (
                  getFilteredAndSortedClasses().map((cls, index) => (
                    <tr key={cls._id || index} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                        {cls.classCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.className}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.educator?.fullName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.educator?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.school ? getSchoolName(cls.school) : 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          (cls.students?.length || 0) > 20 ? 'bg-green-500/20 text-green-400' :
                          (cls.students?.length || 0) > 10 ? 'bg-blue-500/20 text-blue-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {cls.students?.length || 0} students
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.course || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.year || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.block || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {cls.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          cls.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {cls.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="px-6 py-4 text-center text-gray-400">
                      {classSearch ? 'No classes match your search' : 'No class data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading class details...</p>
          </div>
        )}
      </div>
    </div>
  );
}