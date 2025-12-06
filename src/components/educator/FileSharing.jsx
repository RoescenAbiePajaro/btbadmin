// src/components/educator/FileSharing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../Toast';

const FileSharing = ({ educatorId, selectedClassCode = '' }) => {
  const [files, setFiles] = useState([]);
  const [deletingFiles, setDeletingFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterClassCode, setFilterClassCode] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [shareToClassCode, setShareToClassCode] = useState(selectedClassCode || '');
  const [recentActivities, setRecentActivities] = useState([]);
  const [classCodes, setClassCodes] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    fetchClassCodes();
    fetchRecentActivities();
  }, [educatorId]);

  useEffect(() => {
    // When selectedClassCode changes, update the filter and shareToClassCode
    if (selectedClassCode) {
      setShareToClassCode(selectedClassCode);
      setFilterClassCode(selectedClassCode);
      fetchSharedFiles(selectedClassCode);
    } else {
      fetchSharedFiles();
    }
  }, [selectedClassCode]);

  useEffect(() => {
    console.log('ClassCodes loaded:', classCodes);
  }, [classCodes]);

  const fetchClassCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await axios.get(
        `http://localhost:5000/api/classes/my-classes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.data?.classes) {
        console.log('Classes fetched successfully:', response.data.data.classes);
        setClassCodes(response.data.data.classes);
        
        // If no class is selected and educator has classes, select the first one
        if (!selectedClassCode && response.data.data.classes.length > 0) {
          const firstClass = response.data.data.classes[0];
          setShareToClassCode(firstClass.classCode);
          setFilterClassCode(firstClass.classCode);
        }
      } else {
        console.warn('No classes in response:', response.data);
      }
    } catch (error) {
      console.error('Error fetching class codes:', error.response?.data || error.message);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/files/recent`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecentActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const fetchSharedFiles = async (classCode = '') => {
    try {
      const token = localStorage.getItem('token');
      
      // Build query parameters
      const params = {};
      if (classCode) {
        params.classCode = classCode;
      }
      
      const response = await axios.get(
        `http://localhost:5000/api/files/list`,
        { 
          headers: { 
            Authorization: `Bearer ${token}` 
          },
          params: params
        }
      );
      
      if (response.data.success) {
        setFiles(response.data.files || []);
      } else {
        console.error('Failed to fetch files:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching shared files:', error.response?.data || error.message);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !shareToClassCode) {
      showToast('Please select a file and class code', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classCode', shareToClassCode);

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'http://localhost:5000/api/files/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        // Add the new file to the files list
        setFiles([response.data.file, ...files]);
        setSelectedFile(null);
        document.getElementById('file-upload').value = '';
        
        // Refresh recent activities
        await fetchRecentActivities();
        
        showToast('File shared successfully!', 'success');
      } else {
        throw new Error(response.data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast(error.response?.data?.error || error.message || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file', 'error');
    }
  };

  const handleViewFile = (fileUrl) => {
    try {
      // Open in new tab for viewing
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening file:', error);
      showToast('Failed to open file', 'error');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      showToast('File deletion cancelled', 'info');
      return;
    }

    try {
      setDeletingFiles(prev => ({ ...prev, [fileId]: true }));
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(
        `http://localhost:5000/api/files/${fileId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );

      if (response.data.success) {
        // Remove file from state
        setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
        
        // Refresh recent activities
        await fetchRecentActivities();
        
        showToast('File deleted successfully', 'success');
      } else {
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(error.response?.data?.error || error.message || 'Failed to delete file', 'error');
    } finally {
      setDeletingFiles(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const handleFilterChange = (classCode) => {
    setFilterClassCode(classCode);
    fetchSharedFiles(classCode);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const renderFilePreview = (file) => {
    const fileType = file.mimeType?.split('/')[0] || '';
    const fileExtension = file.name?.split('.').pop()?.toLowerCase() || '';
    const fileName = file.name || 'file';
    
    const renderPreview = () => {
      if (fileType === 'image') {
        return (
          <img 
            src={file.url} 
            alt={fileName}
            className="w-16 h-16 object-cover rounded-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtaW1hZ2UiPjcmIzQ3O3BhdGggZD0iTTE0LjUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjcuNUwxNC41IDJ6Ii8+PHBvbHlsaW5lIHBvaW50cz0iMTQgMiAxNCA4IDIwIDgiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7Y2lyY2xlIGN4PSIxNiIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7bC0zLjEtMy4xYTIgMiAwIDAgMC0yLjggMEw4IDE4Ii8+PC9zdmc+';
            }}
          />
        );
      }
      
      // Default file icon with different icons based on file type
      const getFileIcon = () => {
        if (['pdf'].includes(fileExtension)) {
          return (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h6v2H9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14h6v2H9z" />
            </svg>
          );
        } else if (['doc', 'docx'].includes(fileExtension)) {
          return (
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
        } else if (['xls', 'xlsx'].includes(fileExtension)) {
          return (
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
        } else {
          return (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
        }
      };

      return (
        <div className="w-16 h-16 flex items-center justify-center bg-gray-700 rounded-lg">
          {getFileIcon()}
        </div>
      );
    };

    return (
      <button 
        onClick={() => setViewingFile(file)}
        className="text-left focus:outline-none hover:opacity-80 transition-opacity"
        aria-label={`View ${fileName}`}
      >
        {renderPreview()}
      </button>
    );
  };

  const renderFileModal = () => {
    if (!viewingFile) return null;

    const fileType = viewingFile.mimeType?.split('/')[0] || '';
    const fileExtension = viewingFile.name?.split('.').pop()?.toLowerCase() || '';
    const isImage = fileType === 'image';
    const isPdf = fileExtension === 'pdf';
    const isDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingFile(null)}>
        <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white truncate max-w-xs" title={viewingFile.name}>
              {viewingFile.name}
            </h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleDownload(viewingFile.url, viewingFile.name)}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full"
                title="Download"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button 
                onClick={() => setViewingFile(null)}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            {isImage ? (
              <img 
                src={viewingFile.url} 
                alt={viewingFile.name}
                className="max-w-full max-h-[70vh] object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtaW1hZ2UiPjcmIzQ3O3BhdGggZD0iTTE0LjUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjcuNUwxNC41IDJ6Ii8+PHBvbHlsaW5lIHBvaW50cz0iMTQgMiAxNCA4IDIwIDgiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7Y2lyY2xlIGN4PSIxNiIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7bC0zLjEtMy4xYTIgMiAwIDAgMC0yLjggMEw4IDE4Ii8+PC9zdmc+';
                }}
              />
            ) : isPdf ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                  <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-300 mb-6">This PDF can be viewed in the browser or downloaded.</p>
                <button
                  onClick={() => handleDownload(viewingFile.url, viewingFile.name)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF
                </button>
              </div>
            ) : isDocument ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="mb-4 p-4 bg-blue-500/10 rounded-full">
                  <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-300 mb-6 text-center">
                  This document can be downloaded and opened with an appropriate application.
                </p>
                <button
                  onClick={() => handleDownload(viewingFile.url, viewingFile.name)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="mb-4 p-4 bg-gray-500/10 rounded-full">
                  <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-300 mb-6 text-center">
                  This file can be downloaded and opened with an appropriate application.
                </p>
                <button
                  onClick={() => handleDownload(viewingFile.url, viewingFile.name)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  return (
    <div className="space-y-6">
      {viewingFile && renderFileModal()}
      {/* Upload Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:border-purple-500/30">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-purple-500/10 mr-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Upload New File</h3>
              <p className="text-gray-400 text-sm">Share files with your class</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select File
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 transition-colors duration-200">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mt-1 text-sm text-gray-400">
                      <span className="font-medium text-purple-400 hover:text-purple-300">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedFile ? selectedFile.name : 'Supports .pdf, .docx, .jpg, .png (max 10MB)'}
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Share with Class
              <span className="text-red-400 ml-1">*</span>
            </label>
            {classCodes.length === 0 ? (
              <div className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-center">
                <p className="text-gray-300">No classes available.</p>
                <p className="text-sm text-gray-400 mt-1">Create a class first to share files.</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={shareToClassCode}
                  onChange={(e) => setShareToClassCode(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                >
                  <option value="">Select a class</option>
                  {classCodes.map((classItem) => (
                    <option key={classItem._id} value={classItem.classCode}>
                      {classItem.className} ({classItem.classCode})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !shareToClassCode || classCodes.length === 0}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              uploading || !selectedFile || !shareToClassCode || classCodes.length === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-purple-500/20'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Share File
              </>
            )}
          </button>
        </div>
      </div>

      {/* Files List Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Shared Files</h3>
              <p className="text-gray-400 text-sm">Manage and view all shared files</p>
            </div>
            
            <div className="w-full md:w-auto">
              <div className="relative">
                <div className="flex items-center bg-gray-700 rounded-lg overflow-hidden border border-gray-600 focus-within:ring-2 focus-within:ring-purple-500">
                  <div className="pl-3 pr-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search files or classes..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-0 py-2 px-2 text-white placeholder-gray-400 focus:ring-0 focus:outline-none"
                  />
                  {classSearchTerm && (
                    <button 
                      onClick={() => setClassSearchTerm('')}
                      className="p-1 mr-2 text-gray-400 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className="mt-2">
                  <select
                    value={filterClassCode}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                  >
                    <option value="">All Classes</option>
                    {classCodes
                      .filter(classItem => 
                        classItem.className.toLowerCase().includes(classSearchTerm.toLowerCase()) || 
                        classItem.classCode.toLowerCase().includes(classSearchTerm.toLowerCase())
                      )
                      .map((classItem) => (
                        <option key={classItem._id} value={classItem.classCode}>
                          {classItem.className} ({classItem.classCode})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              {filterClassCode && (
                <div className="mt-2 flex items-center text-sm text-purple-400">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V19l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filtered by: {classCodes.find(c => c.classCode === filterClassCode)?.className || filterClassCode}
                  <button 
                    onClick={() => handleFilterChange('')}
                    className="ml-2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-700">
          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file._id}
                className="p-4 hover:bg-gray-750 transition-colors duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 flex items-start sm:items-center gap-4">
                    <div className="flex-shrink-0">
                      {renderFilePreview(file)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-medium truncate">{file.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-400">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900 text-purple-200">
                          {classCodes.find(c => c.classCode === file.classCode)?.className || file.classCode}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(file.size || 0)}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(file.uploadedAt || file.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.url, file.name);
                        }}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        title="Download"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFile(file.url);
                        }}
                        className="text-green-600 hover:text-green-800 mr-3"
                        title="View"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      disabled={deletingFiles[file._id]}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingFiles[file._id] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-lg">No files shared yet</p>
              <p className="text-gray-500 text-sm mt-1">Upload a file to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Recent Activities</h3>
          <p className="text-gray-400 text-sm">Latest file activities across all classes</p>
        </div>
        
        <div className="divide-y divide-gray-700">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-750 transition-colors duration-200">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'upload' ? 'bg-purple-500/10 text-purple-400' :
                    activity.type === 'download' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-green-500/10 text-green-400'
                  }`}>
                    {activity.type === 'upload' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    ) : activity.type === 'download' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-white font-medium">
                        {activity.type === 'upload' ? 'File uploaded' : 
                         activity.type === 'download' ? 'File downloaded' : 'File updated'}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatDate(activity.timestamp || new Date())}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      {activity.fileName} • {activity.classCode}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400">No recent activities</p>
              <p className="text-gray-500 text-sm mt-1">Activities will appear here</p>
            </div>
          )}
        </div>
      </div>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};

export default FileSharing;