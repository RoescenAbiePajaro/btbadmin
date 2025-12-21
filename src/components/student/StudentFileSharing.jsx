import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);

  useEffect(() => {
    if (student && student.enrolledClass) {
      fetchFiles();
      fetchClassInfo();
    }
  }, [student]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/files/list',
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      
      if (response.data.success) {
        setFiles(response.data.files || []);
      } else {
        setError(response.data.error || 'Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.response?.data?.error || 'Error fetching files');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/by-code/${student?.enrolledClass?.classCode}`,
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
      
      // Track download activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'download',
          classCode: student?.enrolledClass?.classCode,
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
      
      // Track view activity
      try {
        await axios.post('http://localhost:5000/api/analytics/file-activity', {
          fileId,
          fileName,
          activityType: 'view',
          classCode: student?.enrolledClass?.classCode,
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
  
  // Filter learning materials (files without type 'assignment')
  const learningMaterials = files.filter(file => file.type !== 'assignment');

  return (
    <div className="space-y-8">
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white">{error}</p>
          </div>
        </div>
      )}

      {/* No Class Enrolled */}
      {!student?.enrolledClass && !loading && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-white font-medium">Not Enrolled in Any Class</p>
              <p className="text-yellow-400 text-sm mt-1">You need to be enrolled in a class to view and submit assignments</p>
            </div>
          </div>
        </div>
      )}

      {/* Learning Materials Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Learning Materials from Educator
        </h3>
        
        <div className="space-y-4">
          {learningMaterials.length > 0 ? (
            learningMaterials.map((material) => (
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
                        <h4 className="text-white font-medium">{material.assignmentTitle || 'Learning Material'}</h4>
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
                        Posted: {formatDate(material.createdAt)}
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
            ))
          ) : !loading && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400">No learning materials yet</p>
              <p className="text-gray-500 text-sm mt-1">Your educator will post learning materials here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFileSharing;