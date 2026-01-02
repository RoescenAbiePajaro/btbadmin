// src/components/student/StudentFileSharing.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student, onRefresh, lastUpdated }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [studentClasses, setStudentClasses] = useState([]);
  const [currentClassCode, setCurrentClassCode] = useState('');
  const [isCurrentClassInactive, setIsCurrentClassInactive] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [lastFilesUpdate, setLastFilesUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const updateStudentData = useCallback(() => {
    console.log('StudentFileSharing - Student prop:', student);
    
    if (student) {
      const allClasses = student.allClasses || [];
      setStudentClasses(allClasses);
      const activeCodes = allClasses.map(c => c.classCode);
      const currentClass = student.enrolledClassDetails || (allClasses.length > 0 ? allClasses[0] : null);
      
      if (currentClass) {
        const code = currentClass.classCode;
        const inactive = code && !activeCodes.includes(code);
        setIsCurrentClassInactive(inactive);
        if (inactive) {
          if (allClasses.length > 0) {
            setCurrentClassCode(allClasses[0].classCode);
          } else {
            setCurrentClassCode('');
            setFiles([]);
            setClassInfo(null);
            setError('Your current class is inactive. Please join or switch to an active class.');
            setLoading(false);
          }
        } else {
          setCurrentClassCode(code);
        }
      } else {
        setCurrentClassCode('');
        setFiles([]);
        setClassInfo(null);
        setError('You are not enrolled in any class');
        setLoading(false);
      }
    }
  }, [student]);

  useEffect(() => {
    updateStudentData();
  }, [updateStudentData]);

  const fetchFiles = useCallback(async (classCode) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log('Fetching files for class code:', classCode);
      
      if (!classCode) {
        setError('No class selected');
        setFiles([]);
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(
          'http://localhost:5000/api/files/list',
          { 
            headers: { 
              Authorization: `Bearer ${token}` 
            },
            params: {
              classCode: classCode
            }
          }
        );
        
        if (response.data.success) {
          const allFiles = response.data.files || [];
          const learningMaterials = allFiles.filter(file => 
            file.type !== 'assignment' && 
            file.type !== 'submission'
          );
          
          console.log('Learning materials:', learningMaterials.length);
          
          // Filter out files that might be orphaned
          const validMaterials = learningMaterials.filter(material => 
            material.url && material.uploadedBy
          );
          
          setFiles(validMaterials);
          setLastFilesUpdate(new Date());
          
          // If no materials and we have a class, fetch class info
          if (validMaterials.length === 0 && classCode) {
            fetchClassInfo(classCode);
          }
        } else {
          setError(response.data.error || 'Failed to fetch files');
        }
      } catch (fetchError) {
        // If class doesn't exist or access denied, clear the files
        if (fetchError.response?.status === 404 || fetchError.response?.status === 403) {
          setFiles([]);
          setError('This class is no longer available');
          // Refresh user data if class might have been deleted
          if (onRefresh) {
            onRefresh();
          }
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.response?.data?.error || 'Error fetching files. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onRefresh]);

  const fetchClassInfo = useCallback(async (classCode) => {
    try {
      if (!classCode) return;
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/by-code/${classCode}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      
      if (response.data.success) {
        setClassInfo(response.data.class);
      }
    } catch (error) {
      console.error('Error fetching class info:', error);
      // If class not found, refresh user data
      if (error.response?.status === 404 && onRefresh) {
        onRefresh();
      }
    }
  }, [onRefresh]);

  // Fetch files when current class code changes
  useEffect(() => {
    if (currentClassCode) {
      fetchFiles(currentClassCode);
      fetchClassInfo(currentClassCode);
    }
  }, [currentClassCode, fetchFiles, fetchClassInfo]);

  // Re-fetch files when student data is refreshed from parent
  useEffect(() => {
    if (lastUpdated && currentClassCode) {
      console.log('Student data updated, refreshing files...');
      fetchFiles(currentClassCode);
    }
  }, [lastUpdated, currentClassCode, fetchFiles]);

  const handleClassChange = async (classCode) => {
    try {
      const token = localStorage.getItem('token');
      
      // Call backend to switch class
      const response = await axios.post(
        'http://localhost:5000/api/student/switch-class',
        { classCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.toast?.type === 'success') {
        setCurrentClassCode(classCode);
        setShowClassSelector(false);
        
        // Update localStorage with new user data
        if (response.data.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        
        // Refresh parent component
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      console.error('Error switching class:', error);
      alert(error.response?.data?.toast?.message || 'Failed to switch class');
    }
  };

  const handleDownloadFile = async (fileUrl, fileId, fileName, educatorId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Track download activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'download',
          classCode: currentClassCode,
          educatorId
        }, {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (trackError) {
        console.error('Error tracking download:', trackError);
      }
      
      // Try multiple download methods
      try {
        // Method 1: Fetch file as blob and download
        const response = await fetch(fileUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch (fetchError) {
        console.log('Fetch method failed, trying fallback...');
      }
      
      // Method 2: Fallback to opening in new tab
      window.open(fileUrl, '_blank');
      
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleViewFile = async (fileUrl, fileId, fileName, educatorId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Track view activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'view',
          classCode: currentClassCode,
          educatorId
        }, {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (trackError) {
        console.error('Error tracking view:', trackError);
      }
      
      // Open file in new tab for viewing
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const canViewInBrowser = (fileName) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop().toLowerCase();
    const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'ppt', 'pptx'];
    return viewableExtensions.includes(extension);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (onRefresh) {
      onRefresh();
    } else {
      fetchFiles(currentClassCode);
    }
  };

  const toggleMaterials = () => {
    setShowMaterials(!showMaterials);
  };

  const learningMaterials = files.filter(file => 
    file.type !== 'assignment' && 
    file.type !== 'submission'
  );

  const filteredMaterials = learningMaterials.filter((material) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (material.assignmentTitle && material.assignmentTitle.toLowerCase().includes(q)) ||
      (material.originalName && material.originalName.toLowerCase().includes(q)) ||
      (material.assignmentDescription && material.assignmentDescription.toLowerCase().includes(q)) ||
      (material.uploaderName && material.uploaderName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-4 text-white">Loading files...</span>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-white">{error}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => fetchFiles(currentClassCode)}
                  className="bg-red-600 hover:bg-red-700 text-white py-1 px-4 rounded text-sm transition duration-200"
                >
                  Try Again
                </button>
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-1 px-4 rounded text-sm transition duration-200"
                  >
                    Refresh Data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">File Sharing</h2>
                <p className="text-gray-400">Access learning materials from your classes</p>
                {lastFilesUpdate && (
                  <p className="text-gray-500 text-xs mt-1">
                    Files updated: {lastFilesUpdate.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center bg-gray-700 rounded-lg overflow-hidden border border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 w-full md:w-64">
                  <div className="pl-3 pr-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-0 py-2 px-2 text-white placeholder-gray-400 focus:ring-0 focus:outline-none w-full"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="p-1 mr-2 text-gray-400 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {studentClasses.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowClassSelector(!showClassSelector)}
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
                      Switch Class ({studentClasses.length})
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                      {refreshing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {showClassSelector && studentClasses.length > 0 && (
              <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Select a Class ({studentClasses.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {studentClasses.map((cls) => (
                    <button
                      key={cls.classCode}
                      onClick={() => handleClassChange(cls.classCode)}
                      className={`w-full text-left p-3 rounded-lg transition duration-200 ${
                        currentClassCode === cls.classCode
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">{cls.className}</div>
                      <div className="text-sm opacity-75">
                        Code: {cls.classCode} • Educator: {cls.educatorName}
                        {currentClassCode === cls.classCode && (
                          <span className="ml-2 text-green-300">(Current)</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Class Information */}
          <div className="p-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {classInfo?.className || 'Class Information'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Current Class</p>
                        <p className="text-white font-mono text-lg font-bold">
                          {currentClassCode || 'No class selected'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Class Name</p>
                        <p className="text-white text-lg">
                          {classInfo?.className || 'Unnamed Class'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Educator</p>
                        <p className="text-white text-lg">
                          {classInfo?.educator?.fullName || classInfo?.educator?.username || 'Educator'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Joined Classes</p>
                        <p className="text-white text-lg font-bold">
                          {studentClasses.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {isCurrentClassInactive && (
                    <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded px-3 py-2">
                      Current class is inactive. Switch to an active class to view materials.
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">
                      {learningMaterials.length} learning material{learningMaterials.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    onClick={toggleMaterials}
                    disabled={isCurrentClassInactive || !currentClassCode}
                    className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 flex items-center gap-2 transform hover:scale-105 ${isCurrentClassInactive || !currentClassCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {showMaterials ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Materials
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        View Materials
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Learning Materials Section */}
            {showMaterials && (
              <div className="mt-6 animate-fadeIn">
                {learningMaterials.length === 0 ? (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-white font-medium">No Learning Materials Yet</p>
                        <p className="text-blue-400 text-sm mt-1">
                          {currentClassCode 
                            ? `Your educator has not shared any learning materials for ${currentClassCode} yet.`
                            : 'Your educator has not shared any learning materials yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <h4 className="text-lg font-semibold text-white">Learning Materials</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-700 rounded-lg overflow-hidden border border-gray-600 focus-within:ring-2 focus-within:ring-blue-500">
                          <div className="pl-3 pr-2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Search materials..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-0 py-2 px-2 text-white placeholder-gray-400 focus:ring-0 focus:outline-none"
                          />
                          {searchTerm && (
                            <button 
                              onClick={() => setSearchTerm('')}
                              className="p-1 mr-2 text-gray-400 hover:text-white"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">
                          {filteredMaterials.length} item{filteredMaterials.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    
                    {filteredMaterials.map((material) => (
                      <div
                        key={material._id}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-purple-900/30 rounded-lg">
                                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-white font-medium text-lg">
                                  {material.assignmentTitle || material.originalName || 'Learning Material'}
                                </h4>
                                <p className="text-gray-300 text-sm mt-1">{material.originalName}</p>
                                {material.assignmentDescription && (
                                  <p className="text-gray-400 text-sm mt-2">{material.assignmentDescription}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400 mt-4">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Posted: {formatDate(material.createdAt || material.uploadedAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span>Size: {formatFileSize(material.size)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>By: {material.uploaderName || 'Educator'}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                            {canViewInBrowser(material.originalName) && (
                              <button
                                onClick={() => handleViewFile(material.url, material._id, material.originalName, material.uploadedBy)}
                                className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-1 min-w-[100px]"
                                title="View file"
                              >
                                <i className="fas fa-eye"></i>
                                View
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadFile(material.url, material._id, material.originalName, material.uploadedBy)}
                              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-1 min-w-[100px]"
                              title="Download file"
                            >
                              <i className="fas fa-download"></i>
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {showMaterials && learningMaterials.length > 0 && (
            <div className="p-6 border-t border-gray-700 bg-gray-800/50">
              <div className="flex justify-between items-center">
                <p className="text-gray-400 text-sm">
                  Showing {learningMaterials.length} learning material{learningMaterials.length !== 1 ? 's' : ''}
                  {currentClassCode && ` from ${currentClassCode}`}
                </p>
                <div className="text-gray-500 text-sm">
                  Last updated: {lastFilesUpdate ? lastFilesUpdate.toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentFileSharing;