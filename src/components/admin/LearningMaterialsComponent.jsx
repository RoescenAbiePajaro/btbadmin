import React, { useState, useRef, useEffect } from 'react';
import {
  FiUsers, FiFileText, FiDownload, FiEye, FiSearch, FiArrowUp, FiFilter
} from 'react-icons/fi';
import { ExportLearningMaterials } from './ExportComponents.jsx';

export default function LearningMaterialsComponent({
  materialSearch,
  setMaterialSearch,
  educatorSharedFiles,
  educatorClassSummary,
  educatorUsers,
  classCodes,
  getSchoolName,
  formatFileSize
}) {
  const [sortBy, setSortBy] = useState('fileName-asc');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const componentRef = useRef(null);
  
  // Helper function to get educator school with proper formatting
  const getEducatorSchool = (educatorId, educatorData) => {
    const school = 
      educatorData?.educatorSchool || 
      educatorUsers[educatorId]?.school || 
      educatorClassSummary?.[educatorId]?.school;
    
    return school ? getSchoolName(school) : 'Not specified';
  };

  // Scroll to top function
  const scrollToTop = () => {
    if (componentRef.current) {
      componentRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show scroll button when scrolling down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter and sort educator files
  const getFilteredAndSortedEducators = () => {
    let educators = [...educatorSharedFiles];
    
    // Apply search filtering
    if (materialSearch) {
      const q = materialSearch.toLowerCase();
      educators = educators.filter(educator => {
        const nameEmail = [educator.educatorName, educator.educatorSchool]
          .filter(Boolean).join(' ').toLowerCase();
        const fileMatch = educator.files?.some(f => 
          [f.name, f.originalName, f.classCode]
            .filter(Boolean).join(' ').toLowerCase().includes(q)
        );
        return nameEmail.includes(q) || fileMatch;
      });
    }
    
    // Group educators by ID to avoid duplicates
    const groupedEducators = educators.reduce((acc, educator) => {
      const educatorId = educator.educatorId || 'unknown';
      if (!acc[educatorId]) {
        acc[educatorId] = {
          ...educator,
          files: [...educator.files]
        };
      } else {
        // Merge files from same educator
        acc[educatorId].files = [...acc[educatorId].files, ...educator.files];
      }
      return acc;
    }, {});
    
    // Sort educator groups
    const sortedEntries = Object.entries(groupedEducators).sort(([idA, educatorA], [idB, educatorB]) => {
      const nameA = educatorA.educatorName?.toLowerCase() || '';
      const nameB = educatorB.educatorName?.toLowerCase() || '';
      
      switch (sortBy) {
        case 'educator-asc':
          return nameA.localeCompare(nameB);
        case 'educator-desc':
          return nameB.localeCompare(nameA);
        case 'oldest':
          // Sort by oldest file upload date
          const oldestA = Math.min(...educatorA.files.map(f => new Date(f.uploadedAt || 0).getTime()));
          const oldestB = Math.min(...educatorB.files.map(f => new Date(f.uploadedAt || 0).getTime()));
          return oldestA - oldestB;
        case 'newest':
          // Sort by newest file upload date
          const newestA = Math.max(...educatorA.files.map(f => new Date(f.uploadedAt || 0).getTime()));
          const newestB = Math.max(...educatorB.files.map(f => new Date(f.uploadedAt || 0).getTime()));
          return newestB - newestA;
        default:
          return 0;
      }
    });
    
    return Object.fromEntries(sortedEntries);
  };

  // Filter and sort files within each educator
  const getFilteredAndSortedFiles = (files) => {
    let filteredFiles = [...files];
    
    // Apply search filtering
    if (materialSearch) {
      const q = materialSearch.toLowerCase();
      filteredFiles = filteredFiles.filter(file => {
        const fileText = [
          file.name, 
          file.originalName, 
          file.classCode,
          file.type
        ].filter(Boolean).join(' ').toLowerCase();
        return fileText.includes(q);
      });
    }
    
    // Apply sorting
    filteredFiles.sort((a, b) => {
      switch (sortBy) {
        case 'fileName-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'fileName-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'oldest':
          return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
        case 'newest':
          return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        default:
          return 0;
      }
    });
    
    return filteredFiles;
  };

  const sortedEducators = getFilteredAndSortedEducators();

  return (
    <div className="space-y-8" ref={componentRef}>
      {/* Search Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full sm:w-96">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={materialSearch}
            onChange={(e) => setMaterialSearch(e.target.value)}
            placeholder="Search materials, educators, files..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
      
      {/* Scroll to Top Button */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-violet-600 hover:bg-violet-700 text-white p-3 rounded-full shadow-lg z-50 transition-all duration-300 hover:scale-110"
          aria-label="Scroll to top"
        >
          <FiArrowUp className="w-5 h-5" />
        </button>
      )}
      
      {/* Educator Summary Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-bold text-white">Educators Summary</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[180px]"
              >
                <optgroup label="Sort by Educator">
                  <option value="educator-asc">Educator A to Z</option>
                  <option value="educator-desc">Educator Z to A</option>
                </optgroup>
                <optgroup label="Sort by File Name">
                  <option value="fileName-asc">File Name A to Z</option>
                  <option value="fileName-desc">File Name Z to A</option>
                </optgroup>
                <optgroup label="Sort by Date">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </optgroup>
              </select>
            </div>
            <ExportLearningMaterials 
              educatorSharedFiles={educatorSharedFiles} 
              getSchoolName={getSchoolName} 
              classCodes={classCodes}
              educatorUsers={educatorUsers}
              educatorClassSummary={educatorClassSummary}
            />
          </div>
        </div>
        
        {Object.keys(sortedEducators).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Educator Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">School</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Files Shared</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Classes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Students</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {Object.entries(sortedEducators).map(([educatorId, educator], idx) => {
                  const totalClasses = new Set(educator.files.map(f => f.classCode)).size;
                  const filteredFiles = getFilteredAndSortedFiles(educator.files);
                  
                  return (
                    <tr key={educatorId} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="font-medium text-white">{educator.educatorName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {getEducatorSchool(educatorId, educator)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="px-2 py-1 rounded text-xs bg-pink-500/20 text-pink-400">
                          {filteredFiles.length} files
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                          {totalClasses} classes
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                          {educatorClassSummary?.[educatorId]?.totalStudents || 0} students
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <button
                          onClick={() => {
                            const scrollToElement = document.getElementById(`educator-${educatorId}`);
                            if (scrollToElement) {
                              scrollToElement.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                        >
                          View Files
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">
            {materialSearch ? 'No educators match your search' : 'No learning material data available'}
          </p>
        )}
      </div>

      {/* Educator Shared Files Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">Files Shared by Educator</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[180px]"
              >
                <optgroup label="Sort by Educator">
                  <option value="educator-asc">Educator A to Z</option>
                  <option value="educator-desc">Educator Z to A</option>
                </optgroup>
                <optgroup label="Sort by File Name">
                  <option value="fileName-asc">File Name A to Z</option>
                  <option value="fileName-desc">File Name Z to A</option>
                </optgroup>
                <optgroup label="Sort by Date">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </optgroup>
              </select>
            </div>
            <ExportLearningMaterials 
              educatorSharedFiles={educatorSharedFiles} 
              getSchoolName={getSchoolName} 
              classCodes={classCodes}
              educatorUsers={educatorUsers}
              educatorClassSummary={educatorClassSummary}
            />
          </div>
        </div>
        
        {Object.keys(sortedEducators).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(sortedEducators).map(([educatorId, educator]) => {
              const filteredFiles = getFilteredAndSortedFiles(educator.files);
              
              if (filteredFiles.length === 0) return null;
              
              return (
                <div key={educatorId} id={`educator-${educatorId}`} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  {/* Educator Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg">
                        <FiUsers className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold text-lg">{educator.educatorName}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-sm text-gray-300">
                            School: {getEducatorSchool(educatorId, educator)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-sm text-blue-300">
                            {filteredFiles.length} files
                          </span>
                          <span className="text-sm text-green-300">
                            {new Set(filteredFiles.map(f => f.classCode)).size} classes
                          </span>
                          <span className="text-sm text-purple-300">
                            {educatorClassSummary?.[educatorId]?.totalStudents || 0} students
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Files List */}
                  {filteredFiles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              File Name {sortBy.includes('fileName') && (
                                <span className="text-xs text-violet-400 ml-1">
                                  {sortBy === 'fileName-asc' ? '↑' : '↓'}
                                </span>
                              )}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                              Uploaded {(sortBy === 'newest' || sortBy === 'oldest') && (
                                <span className="text-xs text-violet-400 ml-1">
                                  {sortBy === 'newest' ? '↓' : '↑'}
                                </span>
                              )}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Size</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {filteredFiles.map((file) => {
                            const classItem = classCodes.find(c => c.classCode === file.classCode);
                            return (
                              <tr key={file.id} className="hover:bg-gray-750">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  <div className="flex items-center gap-3">
                                    {file.mimeType?.startsWith('image/') ? (
                                      <div className="p-2 bg-green-500/10 rounded">
                                        <FiFileText className="w-4 h-4 text-green-400" />
                                      </div>
                                    ) : file.mimeType === 'application/pdf' ? (
                                      <div className="p-2 bg-red-500/10 rounded">
                                        <FiFileText className="w-4 h-4 text-red-400" />
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-gray-500/10 rounded">
                                        <FiFileText className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div className="truncate max-w-xs" title={file.name}>
                                      {file.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  <div className="flex flex-col">
                                    <span className="text-white">{classItem?.className || file.classCode}</span>
                                    {classItem?.description && (
                                      <span className="text-xs text-gray-400">{classItem.description}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  {formatFileSize(file.size)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => window.open(file.url, '_blank')}
                                      className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                                      title="View file"
                                    >
                                      <FiEye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = file.url;
                                        link.download = file.originalName || file.name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                                      title="Download file"
                                    >
                                      <FiDownload className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-400">No files found matching your search</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-800 rounded-lg inline-block mb-4">
              <FiFileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400">
              {materialSearch ? 'No files match your search' : 'No shared files from educators found'}
            </p>
            <p className="text-gray-500 text-sm mt-1">Files shared by educators will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}