import React from 'react';
import {
  FiUsers, FiFileText, FiDownload, FiEye, FiSearch
} from 'react-icons/fi';

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
  
  // Helper function to get educator school with proper formatting
  const getEducatorSchool = (educatorId, educatorData) => {
    const school = 
      educatorData?.educatorSchool || 
      educatorUsers[educatorId]?.school || 
      educatorClassSummary?.[educatorId]?.school;
    
    return school ? getSchoolName(school) : 'Not specified';
  };

  return (
    <div className="space-y-8">
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
      
      {/* Educator Summary Section - Unique Educators */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 text-white">Educators Summary</h3>
        {educatorSharedFiles.length > 0 ? (
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
                {Object.entries(
                  (materialSearch ? educatorSharedFiles.filter(educator => {
                    const q = materialSearch.toLowerCase();
                    const nameEmail = [educator.educatorName, educator.educatorSchool].filter(Boolean).join(' ').toLowerCase();
                    const fileMatch = educator.files?.some(f => [f.name, f.originalName, f.classCode].filter(Boolean).join(' ').toLowerCase().includes(q));
                    return nameEmail.includes(q) || fileMatch;
                  }) : educatorSharedFiles).reduce((acc, educator, index) => {
                    const educatorId = educator.educatorId || 'unknown';
                    if (!acc[educatorId]) {
                      acc[educatorId] = {
                        index: index + 1,
                        educatorId: educatorId,
                        name: educator.educatorName || 'N/A',
                        school: educator.educatorSchool || educatorUsers[educatorId]?.school || educatorClassSummary?.[educatorId]?.school || null,
                        totalFiles: educator.files.length,
                        // Count unique classes for this educator
                        totalClasses: new Set(educator.files.map(f => f.classCode)).size,
                        files: educator.files,
                        // Get unique class codes
                        classCodes: [...new Set(educator.files.map(f => f.classCode))]
                      };
                    } else {
                      // Merge files from same educator if they appear multiple times
                      acc[educatorId].files = [...acc[educatorId].files, ...educator.files];
                      acc[educatorId].totalFiles += educator.files.length;
                      acc[educatorId].classCodes = [...new Set([...acc[educatorId].classCodes, ...educator.files.map(f => f.classCode)])];
                      acc[educatorId].totalClasses = acc[educatorId].classCodes.length;
                    }
                    return acc;
                  }, {})
                ).map(([educatorId, data], idx) => (
                  <tr key={educatorId} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="font-medium text-white">{data.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {data.school ? getSchoolName(data.school) : 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                        {data.totalFiles} files
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
                        {data.totalClasses} classes
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                        {educatorClassSummary?.[educatorId]?.totalStudents || 0} students
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => {
                          // You can implement a modal or expandable view here
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400">No learning material data available</p>
        )}
      </div>

      {/* Educator Shared Files Section - Separated by Educator */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-6 text-white">Files Shared by Educator</h3>
        {educatorSharedFiles.length > 0 ? (
          <div className="space-y-8">
            {/* First, group educators by ID to avoid duplicates */}
            {Object.entries(
              educatorSharedFiles.reduce((acc, educator) => {
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
              }, {})
            ).map(([educatorId, educator]) => {
              // Filter files based on search if needed
              const filteredFiles = materialSearch 
                ? educator.files.filter(file => {
                    const q = materialSearch.toLowerCase();
                    const fileText = [
                      file.name, 
                      file.originalName, 
                      file.classCode,
                      file.type
                    ].filter(Boolean).join(' ').toLowerCase();
                    return fileText.includes(q);
                  })
                : educator.files;

              if (filteredFiles.length === 0 && materialSearch) return null;

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

                  {/* Files List - View and Download only, no cards */}
                  {filteredFiles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-900">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Class Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Uploaded</th>
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
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    file.type === 'assignment' 
                                      ? 'bg-orange-500/20 text-orange-400' 
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}>
                                    {file.type || 'material'}
                                  </span>
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
            }).filter(Boolean) /* Remove null entries */}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-4 bg-gray-800 rounded-lg inline-block mb-4">
              <FiFileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400">No shared files from educators found</p>
            <p className="text-gray-500 text-sm mt-1">Files shared by educators will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}