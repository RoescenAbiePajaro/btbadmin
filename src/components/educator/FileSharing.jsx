import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Toast from '../Toast';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

const FileSharing = ({ educatorId, selectedClassCode = '' }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderStructure, setFolderStructure] = useState([]);
  const [unassignedFiles, setUnassignedFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [deletingFiles, setDeletingFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [shareToClassCode, setShareToClassCode] = useState(selectedClassCode || '');
  const [classCodes, setClassCodes] = useState([]);
  const [viewingFile, setViewingFile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetFileId, setDeleteTargetFileId] = useState(null);
  const [currentFolderPage, setCurrentFolderPage] = useState(1);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState('create');
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [loading, setLoading] = useState({ structure: false });
  
  const itemsPerFolderPage = 5;

  useEffect(() => {
    fetchClassCodes();
  }, [educatorId]);

  useEffect(() => {
    if (selectedClassCode) {
      setShareToClassCode(selectedClassCode);
      fetchFolderStructure(selectedClassCode);
    }
  }, [selectedClassCode]);

  useEffect(() => {
    if (shareToClassCode) {
      fetchFolderStructure(shareToClassCode);
    }
  }, [shareToClassCode]);

  const fetchClassCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/classes/my-classes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.data?.classes) {
        setClassCodes(response.data.data.classes);
        
        if (!selectedClassCode && response.data.data.classes.length > 0) {
          const firstClass = response.data.data.classes[0];
          setShareToClassCode(firstClass.classCode);
        }
      }
    } catch (error) {
      console.error('Error fetching class codes:', error);
    }
  };

  const fetchFolderStructure = async (classCode = '') => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !classCode) return;
      
      setLoading(prev => ({ ...prev, structure: true }));
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/files/folder-structure`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { classCode: classCode.toUpperCase() }
        }
      );
      
      if (response.data.success) {
        setFolderStructure(response.data.folderStructure || []);
        setUnassignedFiles(response.data.unassignedFiles || []);
      }
    } catch (error) {
      console.error('Error fetching folder structure:', error);
      showToast('Error loading files', 'error');
    } finally {
      setLoading(prev => ({ ...prev, structure: false }));
    }
  };

  const fetchFolders = async (classCode) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !classCode) return;
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/folders?classCode=${classCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setFolders(response.data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !shareToClassCode) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://btbtestservice.onrender.com/api/folders',
        {
          name: newFolderName.trim(),
          classCode: shareToClassCode,
          parentId: selectedFolder?._id || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Folder created successfully', 'success');
        setNewFolderName('');
        setShowFolderModal(false);
        await fetchFolders(shareToClassCode);
        await fetchFolderStructure(shareToClassCode);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showToast(error.response?.data?.error || 'Failed to create folder', 'error');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `https://btbtestservice.onrender.com/api/folders/${folderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Folder deleted successfully', 'success');
        await fetchFolders(shareToClassCode);
        await fetchFolderStructure(shareToClassCode);
        
        if (selectedFolder?._id === folderId) {
          setSelectedFolder(null);
        }
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      showToast(error.response?.data?.error || 'Failed to delete folder', 'error');
    }
  };

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

  const openCreateFolderModal = () => {
    setFolderModalMode('create');
    setNewFolderName('');
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !shareToClassCode) {
      showToast('Please select a file and class', 'error');
      return;
    }
    if (!selectedFolder) {
      showToast('Please select a folder', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classCode', shareToClassCode);
    formData.append('folderId', selectedFolder._id);
    formData.append('title', fileTitle);
    formData.append('description', fileDescription);

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        'https://btbtestservice.onrender.com/api/files/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        await fetchFolderStructure(shareToClassCode);
        
        setSelectedFile(null);
        setFileTitle('');
        setFileDescription('');
        document.getElementById('file-upload').value = '';
        
        showToast('File shared successfully!', 'success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast(error.response?.data?.error || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      showToast('Failed to download file', 'error');
    }
  };

  const handleViewFile = (file) => {
    setViewingFile(file);
  };
  
  const openDeleteModal = (fileId) => {
    setDeleteTargetFileId(fileId);
    setShowDeleteModal(true);
  };
  
  const handleDeleteFile = async (fileId) => {
    try {
      setDeletingFiles(prev => ({ ...prev, [fileId]: true }));
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `https://btbtestservice.onrender.com/api/files/${fileId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        await fetchFolderStructure(shareToClassCode);
        showToast('File deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(error.response?.data?.error || 'Failed to delete file', 'error');
    } finally {
      setDeletingFiles(prev => ({ ...prev, [fileId]: false }));
      setShowDeleteModal(false);
      setDeleteTargetFileId(null);
    }
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

  const getFilteredFolders = () => {
    if (!classSearchTerm.trim()) return folderStructure;
    const searchLower = classSearchTerm.toLowerCase();
    return folderStructure.filter(folder => 
      folder.name.toLowerCase().includes(searchLower)
    );
  };

  const getPaginatedFilteredFolders = () => {
    const filtered = getFilteredFolders();
    const startIndex = (currentFolderPage - 1) * itemsPerFolderPage;
    const endIndex = startIndex + itemsPerFolderPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalFolderPages = () => {
    return Math.ceil(getFilteredFolders().length / itemsPerFolderPage);
  };

  const renderFolderIcon = (folder, isExpanded = false, level = 0) => {
    return (
      <div 
        className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => toggleFolderExpansion(folder._id)}
      >
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-yellow-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-white font-medium">{folder.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{folder.files?.length || 0} files</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder._id);
              }}
              className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
              title="Delete Folder"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilePreview = (file) => {
    const fileType = file.mimeType?.split('/')[0] || '';
    const fileExtension = file.name?.split('.').pop()?.toLowerCase() || '';
    
    if (fileType === 'image') {
      return (
        <img src={file.url} alt={file.name} className="w-16 h-16 object-cover rounded-lg" />
      );
    }
    
    const getFileIcon = () => {
      if (['pdf'].includes(fileExtension)) {
        return <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>;
      } else if (['doc', 'docx'].includes(fileExtension)) {
        return <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>;
      } else {
        return <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>;
      }
    };
    
    return <div className="w-16 h-16 flex items-center justify-center bg-gray-700 rounded-lg">{getFileIcon()}</div>;
  };

  const renderFolderWithFiles = (folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder._id);
    const hasFiles = folder.files && folder.files.length > 0;
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;

    return (
      <div key={folder._id} className="mb-1">
        {renderFolderIcon(folder, isExpanded, level)}
        
        {isExpanded && (
          <div className="ml-4 border-l border-gray-700">
            {hasFiles && (
              <div className="space-y-1 mb-2">
                {folder.files.map((file) => (
                  <div
                    key={file._id}
                    className="p-3 hover:bg-gray-750 transition-colors duration-200 ml-2 cursor-pointer"
                    onClick={() => handleViewFile(file)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 flex items-start sm:items-center gap-4">
                        <div className="flex-shrink-0">{renderFilePreview(file)}</div>
                        <div className="min-w-0">
                          <h4 className="text-white font-medium truncate">{file.title || file.name}</h4>
                          {file.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{file.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs text-gray-400">{formatFileSize(file.size || 0)}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{formatDate(file.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDownload(file.url, file.name)} className="text-blue-400 hover:text-blue-300 p-1">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button onClick={() => openDeleteModal(file._id)} disabled={deletingFiles[file._id]} className="text-red-400 hover:text-red-300 p-1">
                          {deletingFiles[file._id] ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-red-400"></div>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {hasSubfolders && (
              <div className="space-y-1">
                {folder.subfolders.map((subfolder) => renderFolderWithFiles(subfolder, level + 1))}
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

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingFile(null)}>
        <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white truncate">{viewingFile.title || viewingFile.name}</h3>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleDownload(viewingFile.url, viewingFile.name)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button onClick={() => setViewingFile(null)} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Title and Description Section */}
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">File Name</h4>
              <p className="text-gray-300 text-sm">{viewingFile.originalName || viewingFile.name}</p>
            </div>
            
            {viewingFile.title && viewingFile.title.trim() !== '' && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Title</h4>
                <p className="text-white font-medium">{viewingFile.title}</p>
              </div>
            )}
            
            {viewingFile.description && viewingFile.description.trim() !== '' && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Instructions for Students</h4>
                <div className="text-gray-300 whitespace-pre-wrap bg-gray-900/50 rounded-lg p-3 mt-1">
                  {viewingFile.description}
                </div>
              </div>
            )}
            
            <div className="mt-3 pt-2 border-t border-gray-700 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Uploaded:</span><span className="text-gray-400 ml-2">{formatDate(viewingFile.createdAt)}</span></div>
              <div><span className="text-gray-500">Size:</span><span className="text-gray-400 ml-2">{formatFileSize(viewingFile.size || 0)}</span></div>
              <div><span className="text-gray-500">Type:</span><span className="text-gray-400 ml-2">{viewingFile.mimeType || 'Unknown'}</span></div>
              <div><span className="text-gray-500">Uploaded by:</span><span className="text-gray-400 ml-2">{viewingFile.uploaderName || 'Unknown'}</span></div>
            </div>
          </div>
          
          {/* File Preview */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px]">
            {isImage ? (
              <img src={viewingFile.url} alt={viewingFile.title || viewingFile.name} className="max-w-full max-h-[70vh] object-contain" />
            ) : (
              <div className="text-center">
                <div className="mb-4 p-4 bg-gray-700 rounded-full inline-block">
                  {renderFilePreview(viewingFile)}
                </div>
                <p className="text-gray-300 mb-4">Click download to view this file</p>
                <button onClick={() => handleDownload(viewingFile.url, viewingFile.name)} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
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
      
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTargetFileId(null); }}
        onConfirm={() => { if (deleteTargetFileId) handleDeleteFile(deleteTargetFileId); }}
        deleteMode="single"
        isDeleting={deleteTargetFileId ? !!deletingFiles[deleteTargetFileId] : false}
      />
      
      {/* Upload Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-pink-500/10 mr-4">
              <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select File *</label>
            <label className="cursor-pointer">
              <div className="flex items-center justify-center w-full px-4 py-10 border-2 border-dashed border-gray-600 rounded-lg hover:border-pink-500">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-1 text-sm text-gray-400">
                    <span className="font-medium text-pink-400">Click to upload</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{selectedFile ? selectedFile.name : 'Max 50MB'}</p>
                </div>
                <input id="file-upload" type="file" onChange={handleFileSelect} className="hidden" />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">File Title (Optional)</label>
            <input
              type="text"
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              placeholder="Enter a title for this file"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description / Instructions (Optional)</label>
            <textarea
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              placeholder="Add instructions or a description for your students..."
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 resize-y"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{fileDescription.length}/500 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Share with Class *</label>
            <select
              value={shareToClassCode}
              onChange={(e) => setShareToClassCode(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="">Select a class</option>
              {classCodes.map((classItem) => (
                <option key={classItem._id} value={classItem.classCode}>
                  {classItem.className} ({classItem.classCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Folder *</label>
            <div className="flex gap-2">
              <select
                value={selectedFolder?._id || ''}
                onChange={(e) => {
                  const folderId = e.target.value;
                  const folder = folders.find(f => f._id === folderId);
                  setSelectedFolder(folder || null);
                }}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select a folder</option>
                {folders.filter(f => !f.parentId).map((folder) => (
                  <option key={folder._id} value={folder._id}>📁 {folder.name}</option>
                ))}
              </select>
              <button onClick={openCreateFolderModal} className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
                New Folder
              </button>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !shareToClassCode || !selectedFolder}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              uploading || !selectedFile || !shareToClassCode || !selectedFolder
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-600 to-pink-600 text-white hover:from-pink-700'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
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
      <div className="bg-gray-800 border border-gray-700 rounded-xl">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Shared Files</h3>
          <p className="text-gray-400 text-sm">Manage and view all shared files</p>
          
          <div className="mt-4 flex gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={classSearchTerm}
                onChange={(e) => setClassSearchTerm(e.target.value)}
                placeholder="Search folders..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading.structure ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <>
              {getPaginatedFilteredFolders().map((folder) => renderFolderWithFiles(folder, 0))}
              
              {unassignedFiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="px-4 py-2 bg-gray-700/50 rounded-lg mb-2">
                    <h4 className="text-sm font-medium text-gray-300">Files Not in Folders</h4>
                  </div>
                  <div className="space-y-2">
                    {unassignedFiles.map((file) => (
                      <div key={file._id} className="p-4 hover:bg-gray-750 rounded-lg border border-gray-700 cursor-pointer" onClick={() => handleViewFile(file)}>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                            {renderFilePreview(file)}
                            <div>
                              <h4 className="text-white font-medium">{file.title || file.name}</h4>
                              {file.description && <p className="text-gray-400 text-sm mt-1">{file.description}</p>}
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-400">{formatDate(file.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleDownload(file.url, file.name)} className="text-blue-400 p-1">Download</button>
                            <button onClick={() => openDeleteModal(file._id)} className="text-red-400 p-1">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {getFilteredFolders().length === 0 && unassignedFiles.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400">No files shared yet</p>
                  <p className="text-gray-500 text-sm mt-1">Upload a file to get started</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowFolderModal(false)} className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg">Cancel</button>
              <button onClick={handleCreateFolder} className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />}
    </div>
  );
};

export default FileSharing;