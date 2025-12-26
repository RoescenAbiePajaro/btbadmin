import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student, onClassChange }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [studentClasses, setStudentClasses] = useState([]);
  const [currentClassCode, setCurrentClassCode] = useState('');
  const [showClassSelector, setShowClassSelector] = useState(false);

  useEffect(() => {
    console.log('StudentFileSharing - Student prop:', student);
    
    if (student) {
      // Get all classes from student data
      const allClasses = student.allClasses || [];
      setStudentClasses(allClasses);
      
      // Set current class from enrolledClassDetails or first class
      const currentClass = student.enrolledClassDetails || 
                          (allClasses.length > 0 ? allClasses[0] : null);
      
      if (currentClass) {
        setCurrentClassCode(currentClass.classCode);
        fetchFiles(currentClass.classCode);
        fetchClassInfo(currentClass.classCode);
      } else {
        setLoading(false);
        setError('You are not enrolled in any class');
      }
    }
  }, [student]);

  const fetchFiles = async (classCode) => {
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
        
        setFiles(learningMaterials);
      } else {
        setError(response.data.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.response?.data?.error || 'Error fetching files. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClassInfo = async (classCode) => {
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
    }
  };

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
        fetchFiles(classCode);
        fetchClassInfo(classCode);
        setShowClassSelector(false);
        
        // Update localStorage with new user data
        if (response.data.data?.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        
        // Notify parent component
        if (onClassChange) {
          onClassChange(classCode);
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
      
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleViewFile = async (fileUrl, fileId, fileName, educatorId) => {
    // Keep your existing view file logic
    // ... (same as before)
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
    fetchFiles(currentClassCode);
  };

  const toggleMaterials = () => {
    setShowMaterials(!showMaterials);
  };

  const learningMaterials = files.filter(file => 
    file.type !== 'assignment' && 
    file.type !== 'submission'
  );

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
              <button
                onClick={() => fetchFiles(currentClassCode)}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white py-1 px-4 rounded text-sm transition duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">File Sharing</h2>
                <p className="text-gray-400">Access learning materials from your classes</p>
              </div>
              <div className="flex gap-3">
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
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200 flex items-center gap-2 transform hover:scale-105"
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
                          Your educator has not shared any learning materials yet.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">Learning Materials</h4>
                      <span className="text-gray-400 text-sm">
                        {learningMaterials.length} item{learningMaterials.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {learningMaterials.map((material) => (
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
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadFile(material.url, material._id, material.originalName, material.uploadedBy)}
                              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-1 min-w-[100px]"
                              title="Download file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
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
                  Last updated: {new Date().toLocaleTimeString()}
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