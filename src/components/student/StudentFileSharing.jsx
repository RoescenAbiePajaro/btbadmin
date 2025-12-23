// src/components/student/StudentFileSharing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('StudentFileSharing - Student prop:', student);
    console.log('Enrolled class details:', student?.enrolledClassDetails);
    console.log('Enrolled class object:', student?.enrolledClass);
    
    if (student) {
      fetchFiles();
      if (student.enrolledClassDetails?.classCode || student?.enrolledClass?.classCode) {
        fetchClassInfo();
      }
    }
  }, [student]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      // Check if student has an enrolled class
      const classCode = student?.enrolledClassDetails?.classCode || 
                       (student?.enrolledClass?.classCode);
      
      console.log('Fetching files for class code:', classCode);
      
      if (!classCode) {
        setError('You are not enrolled in any class');
        setFiles([]);
        setLoading(false);
        return;
      }
      
      // Use the files/list endpoint with classCode parameter
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
      
      console.log('Files response:', response.data);
      
      if (response.data.success) {
        // Filter out assignment files and only show learning materials
        const allFiles = response.data.files || [];
        const learningMaterials = allFiles.filter(file => 
          file.type !== 'assignment' && 
          file.type !== 'submission'
        );
        
        console.log('Total files:', allFiles.length);
        console.log('Learning materials:', learningMaterials.length);
        console.log('Files:', allFiles);
        
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

  const fetchClassInfo = async () => {
    try {
      const classCode = student?.enrolledClassDetails?.classCode || 
                       (student?.enrolledClass?.classCode);
      
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

  const handleDownloadFile = async (fileUrl, fileId, fileName, educatorId) => {
    try {
      const token = localStorage.getItem('token');
      const classCode = student?.enrolledClassDetails?.classCode || 
                       (student?.enrolledClass?.classCode);
      
      // Track download activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'download',
          classCode: classCode,
          educatorId
        }, {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (trackError) {
        console.error('Error tracking download:', trackError);
        // Continue with download even if tracking fails
      }
      
      // Direct download from Supabase
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
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

  // Check if file can be viewed in the browser
  const canViewInBrowser = (fileName) => {
    if (!fileName) return false;
    const extension = fileName.split('.').pop().toLowerCase();
    const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv', 'xlsx', 'xls', 'docx', 'doc', 'ppt', 'pptx'];
    return viewableExtensions.includes(extension);
  };

  // Handle viewing file in browser
  const handleViewFile = async (fileUrl, fileId, fileName, educatorId) => {
    if (!canViewInBrowser(fileName)) {
      alert('This file type cannot be viewed in the browser. Please download it instead.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const classCode = student?.enrolledClassDetails?.classCode || 
                       (student?.enrolledClass?.classCode);
      
      // Track view activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'view',
          classCode: classCode,
          educatorId
        }, {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (trackError) {
        console.error('Error tracking view:', trackError);
        // Continue with view even if tracking fails
      }
      
      // For PDFs and images, we can open them directly
      const extension = fileName.split('.').pop().toLowerCase();
      const isPdf = extension === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(extension);
      
      if (isPdf || isImage) {
        window.open(fileUrl, '_blank');
      } else {
        // For other viewable files, we'll use Google Docs Viewer
        const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        window.open(googleDocsViewerUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file. Please try downloading it instead.');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFiles();
  };

  // Filter learning materials (files without type 'assignment')
  const learningMaterials = files.filter(file => 
    file.type !== 'assignment' && 
    file.type !== 'submission'
  );

  console.log('Rendering with files:', files.length);
  console.log('Learning materials:', learningMaterials.length);

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <span className="ml-4 text-white">Loading files...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-white">{error}</p>
              <button
                onClick={fetchFiles}
                className="mt-2 bg-red-600 hover:bg-red-700 text-white py-1 px-4 rounded text-sm transition duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Class Enrolled */}
      {!student?.enrolledClassDetails && !student?.enrolledClass && !loading && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-white font-medium">Not Enrolled in Any Class</p>
              <p className="text-yellow-400 text-sm mt-1">You need to be enrolled in a class to view learning materials</p>
            </div>
          </div>
        </div>
      )}

      {/* Class enrolled but no files */}
      {(student?.enrolledClassDetails || student?.enrolledClass) && !loading && learningMaterials.length === 0 && !error && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-white font-medium">No Learning Materials Yet</p>
              <p className="text-blue-400 text-sm mt-1">
                Your educator has not shared any learning materials yet for {student.enrolledClassDetails?.className || 'your class'}
              </p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-4 rounded text-sm transition duration-200 disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Learning Materials Section */}
      {learningMaterials.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Learning Materials from Educator
              </h3>
              {classInfo && (
                <p className="text-gray-400 text-sm mt-1">
                  Class: {classInfo.className} ({classInfo.classCode})
                </p>
              )}
            </div>
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
          </div>
          
          <div className="space-y-4">
            {learningMaterials.map((material) => (
              <div
                key={material._id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-900/30 rounded-lg">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{material.assignmentTitle || material.originalName || 'Learning Material'}</h4>
                        <p className="text-gray-300 text-sm">{material.originalName}</p>
                        {material.assignmentDescription && (
                          <p className="text-gray-400 text-sm mt-1">{material.assignmentDescription}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-3">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Posted: {formatDate(material.createdAt || material.uploadedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {formatFileSize(material.size)}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        By: {material.uploaderName || 'Educator'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {canViewInBrowser(material.originalName) && (
                      <button
                        onClick={() => handleViewFile(material.url, material._id, material.originalName, material.uploadedBy)}
                        className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center whitespace-nowrap"
                        title="View file"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(material.url, material._id, material.originalName, material.uploadedBy)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center whitespace-nowrap"
                      title="Download file"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">
                Showing {learningMaterials.length} learning material{learningMaterials.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFileSharing;