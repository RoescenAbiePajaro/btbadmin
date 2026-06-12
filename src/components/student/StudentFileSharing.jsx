// src/components/student/StudentFileSharing.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student, onRefresh, lastUpdated }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [studentClasses, setStudentClasses] = useState([]);
  const [currentClassCode, setCurrentClassCode] = useState('');
  const [isCurrentClassInactive, setIsCurrentClassInactive] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [lastFilesUpdate, setLastFilesUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Folder tree and submissions states
  const [folderStructure, setFolderStructure] = useState([]);
  const [unassignedFiles, setUnassignedFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [submissions, setSubmissions] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('materials'); // 'materials' or 'submissions'
  const [viewingFile, setViewingFile] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

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
            setFolderStructure([]);
            setUnassignedFiles([]);
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
        setFolderStructure([]);
        setUnassignedFiles([]);
        setClassInfo(null);
        setError('You are not enrolled in any class');
        setLoading(false);
      }
    }
  }, [student]);

  useEffect(() => {
    updateStudentData();
  }, [updateStudentData]);

  const fetchSubmissions = useCallback(async (classCode) => {
    try {
      if (!classCode) return;
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'https://btbtestservice.onrender.com/api/files/my-submissions',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { classCode }
        }
      );
      if (response.data.success) {
        setSubmissions(response.data.submissions || []);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  }, []);

  const fetchFiles = useCallback(async (classCode) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      console.log('Fetching files (folder-structure) for class code:', classCode);
      
      if (!classCode) {
        setError('No class selected');
        setFiles([]);
        setFolderStructure([]);
        setUnassignedFiles([]);
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(
          'https://btbtestservice.onrender.com/api/files/folder-structure',
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
          setFolderStructure(response.data.folderStructure || []);
          setUnassignedFiles(response.data.unassignedFiles || []);
          
          // Flatten files for list-based counts/searches if needed
          const flatFiles = [];
          const extractFiles = (folders) => {
            folders.forEach(f => {
              if (f.files) flatFiles.push(...f.files);
              if (f.subfolders) extractFiles(f.subfolders);
            });
          };
          extractFiles(response.data.folderStructure || []);
          flatFiles.push(...(response.data.unassignedFiles || []));
          setFiles(flatFiles);
          
          setLastFilesUpdate(new Date());
          
          // Fetch class info
          fetchClassInfo(classCode);
        } else {
          setError(response.data.error || 'Failed to fetch files');
        }
      } catch (fetchError) {
        // If class doesn't exist or access denied, clear the files
        if (fetchError.response?.status === 404 || fetchError.response?.status === 403) {
          setFiles([]);
          setFolderStructure([]);
          setUnassignedFiles([]);
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
        `https://btbtestservice.onrender.com/api/classes/by-code/${classCode}`,
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
      fetchSubmissions(currentClassCode);
    }
  }, [currentClassCode, fetchFiles, fetchSubmissions]);

  // Re-fetch files when student data is refreshed from parent
  useEffect(() => {
    if (lastUpdated && currentClassCode) {
      console.log('Student data updated, refreshing files...');
      fetchFiles(currentClassCode);
      fetchSubmissions(currentClassCode);
    }
  }, [lastUpdated, currentClassCode, fetchFiles, fetchSubmissions]);

  const handleClassChange = async (classCode) => {
    try {
      const token = localStorage.getItem('token');
      
      // Call backend to switch class
      const response = await axios.post(
        'https://btbtestservice.onrender.com/api/student/switch-class',
        { classCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.toast?.type === 'success') {
        setCurrentClassCode(classCode);
        setShowClassSelector(false);
        setActiveSubTab('materials');
        
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
        await axios.post('https://btbtestservice.onrender.com/api/analytics/file-activity', {
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

  const handleViewFile = async (file) => {
    try {
      const token = localStorage.getItem('token');
      
      // Track view activity
      try {
        await axios.post('https://btbtestservice.onrender.com/api/analytics/file-activity', {
          fileId: file._id,
          fileName: file.originalName || file.name,
          activityType: 'view',
          classCode: currentClassCode,
          educatorId: file.uploadedBy?._id || file.uploadedBy
        }, {
          headers: {
            Authorization: `Bearer ${token}` 
          }
        });
      } catch (trackError) {
        console.error('Error tracking view:', trackError);
      }
      
      // Set viewing file details to show modal
      setViewingFile(file);
      setSubmissionFile(null);
      setUploadError('');
      setUploadSuccess('');
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error viewing file. Please try again.');
    }
  };

  const handleUploadSubmission = async (e) => {
    e.preventDefault();
    if (!submissionFile || !viewingFile) {
      setUploadError('Please select a file to submit.');
      return;
    }

    setSubmitting(true);
    setUploadError('');
    setUploadSuccess('');

    const formData = new FormData();
    formData.append('file', submissionFile);
    formData.append('classCode', currentClassCode);
    formData.append('folderId', viewingFile.folderId || '');
    formData.append('parentFileId', viewingFile._id);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://btbtestservice.onrender.com/api/files/upload-submission',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setUploadSuccess('Submission uploaded successfully!');
        setSubmissionFile(null);
        const fileInput = document.getElementById('submission-upload');
        if (fileInput) fileInput.value = '';

        // Refresh submissions
        await fetchSubmissions(currentClassCode);
        
        // Auto switch tab to submissions list and close modal
        setTimeout(() => {
          setViewingFile(null);
          setActiveSubTab('submissions');
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Failed to upload submission');
      }
    } catch (err) {
      console.error('Submission upload error:', err);
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload submission.');
    } finally {
      setSubmitting(false);
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
      fetchSubmissions(currentClassCode);
    }
  };

  // Folder Expansion Helpers
  const toggleFolderExpansion = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getFileIcon = (fileExtension) => {
    if (['pdf'].includes(fileExtension)) {
      return (
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h6v2H9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14h6v2H9z" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(fileExtension)) {
      return (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (['xls', 'xlsx'].includes(fileExtension)) {
      return (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      return (
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const renderFolderIcon = (folder, isExpanded = false, level = 0) => {
    return (
      <div 
        className="flex items-center gap-2 p-3 hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => toggleFolderExpansion(folder._id)}
      >
        <div className="flex items-center gap-1">
          <svg 
            className="w-4 h-4 text-yellow-400 transition-transform duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-white font-medium">{folder.name}</span>
          <span className="text-xs text-gray-400">
            {folder.files?.length || 0} file{folder.files?.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  };

  const renderFolderWithFiles = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder._id);
    const hasFiles = folder.files && folder.files.length > 0;
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

    // Filter folder files based on search term
    const filteredFolderFiles = (folder.files || []).filter(file => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (file.title && file.title.toLowerCase().includes(q)) ||
        (file.originalName && file.originalName.toLowerCase().includes(q)) ||
        (file.description && file.description.toLowerCase().includes(q))
      );
    });

    const isMatch = filteredFolderFiles.length > 0 || hasSubfolders;

    if (searchTerm && !isMatch) return null;

    return (
      <div key={folder._id} className="mb-1 border border-gray-700/30 rounded-lg overflow-hidden bg-gray-900/10">
        {renderFolderIcon(folder, isExpanded || !!searchTerm, level)}
        
        {(isExpanded || !!searchTerm) && (
          <div className="ml-4 border-l border-gray-700/50 pl-2 pr-2 pb-2">
            {/* Render files in this folder */}
            {filteredFolderFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {filteredFolderFiles.map((file) => (
                  <div
                    key={file._id}
                    onClick={() => handleViewFile(file)}
                    className="p-3 hover:bg-gray-750 transition-colors duration-200 ml-2 cursor-pointer flex items-center justify-between gap-4 border border-transparent hover:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.name?.split('.').pop()?.toLowerCase())}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-medium truncate text-sm" title={file.title || file.originalName || file.name}>
                          {file.title || file.originalName || file.name}
                        </h4>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file.url, file._id, file.originalName || file.name, file.uploadedBy?._id || file.uploadedBy);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Download"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Render subfolders */}
            {hasSubfolders && (
              <div className="space-y-1">
                {folder.subfolders.map((subfolder) => renderFolderWithFiles(subfolder, level + 1))}
              </div>
            )}
            
            {!hasFiles && !hasSubfolders && (
              <div className="text-gray-500 text-xs py-2 pl-4 italic">
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFileModal = () => {
    if (!viewingFile) return null;

    const fileType = viewingFile.mimeType?.split('/')[0] || '';
    const fileExtension = viewingFile.name?.split('.').pop()?.toLowerCase() || '';
    const isImage = fileType === 'image';
    const fileName = viewingFile.title || viewingFile.originalName || viewingFile.name;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setViewingFile(null)}>
        <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white truncate max-w-[80%]" title={fileName}>
              {fileName}
            </h3>
            <button 
              onClick={() => setViewingFile(null)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-750 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* File Details / Preview */}
            <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700/50 flex flex-col items-center justify-center min-h-[200px]">
              {isImage ? (
                <img 
                  src={viewingFile.url} 
                  alt={fileName}
                  className="max-w-full max-h-[250px] object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center p-4">
                  <div className="mb-3 flex justify-center">
                    {getFileIcon(fileExtension)}
                  </div>
                  <p className="text-gray-300 text-sm font-medium">{viewingFile.originalName || viewingFile.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{formatFileSize(viewingFile.size)}</p>
                </div>
              )}
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleDownloadFile(viewingFile.url, viewingFile._id, viewingFile.originalName || viewingFile.name, viewingFile.uploadedBy?._id || viewingFile.uploadedBy)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition duration-200 flex items-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Download File
                </button>
                {canViewInBrowser(viewingFile.originalName || viewingFile.name) && (
                  <button
                    onClick={() => {
                      window.open(viewingFile.url, '_blank');
                    }}
                    className="px-4 py-2 bg-gray-750 hover:bg-gray-700 text-white border border-gray-650 rounded-lg text-sm font-medium transition duration-200 flex items-center gap-2"
                  >
                    <i className="fas fa-eye"></i>
                    View File
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            {viewingFile.description && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-gray-300">Description</h4>
                <p className="text-gray-400 text-sm bg-gray-900/20 p-3 rounded-lg border border-gray-700/30">{viewingFile.description}</p>
              </div>
            )}

            {/* Submission Upload Section */}
            <div className="border-t border-gray-700/80 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/10">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h4 className="text-md font-semibold text-white">Upload Your Submission</h4>
              </div>
              
              <form onSubmit={handleUploadSubmission} className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors bg-gray-900/30">
                  <input
                    id="submission-upload"
                    type="file"
                    onChange={(e) => {
                      setSubmissionFile(e.target.files[0]);
                      setUploadError('');
                      setUploadSuccess('');
                    }}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {submissionFile && (
                    <p className="text-xs text-green-400 mt-2 font-medium">
                      Selected: {submissionFile.name} ({formatFileSize(submissionFile.size)})
                    </p>
                  )}
                </div>

                {uploadError && (
                  <p className="text-red-400 text-sm text-center">{uploadError}</p>
                )}
                {uploadSuccess && (
                  <p className="text-green-400 text-sm text-center font-medium">{uploadSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !submissionFile}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Submit Response
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubmissionsTab = () => {
    if (submissions.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-900/20 rounded-xl border border-gray-700/60 p-6">
          <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400">No submissions uploaded yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {submissions.map((sub) => {
          const assignmentName = sub.parentFileId?.title || sub.parentFileId?.originalName || sub.parentFileId?.name || 'Assignment';
          const isGraded = sub.score !== null && sub.score !== undefined;
          
          return (
            <div key={sub._id} className="bg-gray-900 border border-gray-700/80 rounded-xl p-5 hover:border-gray-600 transition duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded border border-blue-800/40">
                      Response to: {assignmentName}
                    </span>
                    <span className="text-gray-500 text-xs">•</span>
                    <span className="text-gray-400 text-xs">Submitted: {formatDate(sub.createdAt)}</span>
                  </div>
                  
                  <h4 className="text-white font-medium text-lg truncate" title={sub.originalName}>
                    {sub.originalName}
                  </h4>
                  <p className="text-gray-500 text-xs mt-1">Size: {formatFileSize(sub.size)}</p>

                  {/* Feedback display */}
                  {isGraded && sub.feedback && (
                    <div className="mt-3 p-3 bg-gray-950/40 rounded-lg border border-gray-800/50">
                      <p className="text-gray-400 text-xs font-semibold">Educator Feedback:</p>
                      <p className="text-gray-300 text-sm mt-1 italic">"{sub.feedback}"</p>
                    </div>
                  )}
                </div>

                {/* Score and action */}
                <div className="flex items-center gap-6 justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <p className="text-gray-500 text-xs">Grade Score</p>
                    {isGraded ? (
                      <p className="text-2xl font-bold text-green-400 mt-0.5">
                        {sub.score} <span className="text-gray-500 text-xs">/ 100</span>
                      </p>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300 border border-yellow-800/50 mt-1">
                        Not Graded Yet
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(sub.url, '_blank')}
                      className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-400 hover:text-blue-300 rounded-lg transition-colors"
                      title="View Submitted File"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => handleDownloadFile(sub.url, sub._id, sub.originalName, sub.uploadedBy)}
                      className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-green-400 hover:text-green-300 rounded-lg transition-colors"
                      title="Download Submitted File"
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredUnassignedFiles = unassignedFiles.filter((file) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (file.title && file.title.toLowerCase().includes(q)) ||
      (file.originalName && file.originalName.toLowerCase().includes(q)) ||
      (file.description && file.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      {viewingFile && renderFileModal()}

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition duration-200 mb-6">
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
                    <span className="text-sm font-medium">
                      {files.length} material{files.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub Tabs Control: shown once they have submitted something */}
            {submissions.length > 0 && (
              <div className="flex border-b border-gray-700 mb-6">
                <button
                  onClick={() => setActiveSubTab('materials')}
                  className={`py-3 px-6 font-semibold text-sm border-b-2 transition duration-200 ${
                    activeSubTab === 'materials' 
                      ? 'border-blue-500 text-blue-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Learning Materials
                </button>
                <button
                  onClick={() => setActiveSubTab('submissions')}
                  className={`py-3 px-6 font-semibold text-sm border-b-2 transition duration-200 ${
                    activeSubTab === 'submissions' 
                      ? 'border-blue-500 text-blue-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Student submission
                </button>
              </div>
            )}

            {/* Tab Contents */}
            {activeSubTab === 'materials' ? (
              <div className="space-y-4">
                {folderStructure.length > 0 || filteredUnassignedFiles.length > 0 ? (
                  <div className="space-y-3">
                    {/* Folders list */}
                    {folderStructure.map((folder) => renderFolderWithFiles(folder, 0))}

                    {/* Unassigned files list */}
                    {filteredUnassignedFiles.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-700/60">
                        <div className="px-4 py-2 bg-gray-700/30 rounded-lg mb-3">
                          <h4 className="text-sm font-medium text-gray-300">Files Not in Folders</h4>
                        </div>
                        <div className="space-y-1">
                          {filteredUnassignedFiles.map((file) => (
                            <div
                              key={file._id}
                              onClick={() => handleViewFile(file)}
                              className="p-3 hover:bg-gray-750 transition-colors duration-200 rounded-lg border border-transparent hover:border-gray-700 cursor-pointer flex items-center justify-between gap-4"
                            >
                              <div className="flex-1 flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0">
                                  {getFileIcon(file.name?.split('.').pop()?.toLowerCase())}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-white font-medium truncate text-sm" title={file.title || file.originalName || file.name}>
                                    {file.title || file.originalName || file.name}
                                  </h4>
                                  <p className="text-gray-400 text-xs mt-0.5">
                                    {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(file.url, file._id, file.originalName || file.name, file.uploadedBy?._id || file.uploadedBy);
                                  }}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                                  title="Download"
                                >
                                  <i className="fas fa-download"></i>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-900/10 border border-blue-800/40 rounded-xl p-6 text-center">
                    <p className="text-white font-medium">No files available yet</p>
                    <p className="text-blue-400/80 text-sm mt-1">Your educator has not shared any files for this class yet.</p>
                  </div>
                )}
              </div>
            ) : (
              renderSubmissionsTab()
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFileSharing;