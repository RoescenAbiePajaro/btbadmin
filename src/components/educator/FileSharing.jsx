// src/components/educator/FileSharing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentSubmissions, setStudentSubmissions] = useState([]);

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
    if (selectedAssignment) {
      fetchStudentSubmissions(selectedAssignment._id);
    }
  }, [selectedAssignment]);

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

  const fetchStudentSubmissions = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/files/assignment-submissions/${assignmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setStudentSubmissions(response.data.submissions || []);
      } else {
        console.error('Error fetching submissions:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching student submissions:', error);
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
      alert('Please select a file and class code');
      return;
    }

    if (!assignmentTitle.trim()) {
      alert('Please enter an assignment title');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('classCode', shareToClassCode);
    formData.append('title', assignmentTitle);
    formData.append('description', assignmentDescription);
    
    if (submissionDeadline) {
      formData.append('submissionDeadline', submissionDeadline);
    }

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
        setAssignmentTitle('');
        setAssignmentDescription('');
        setSubmissionDeadline('');
        document.getElementById('file-upload').value = '';
        
        // Refresh recent activities
        await fetchRecentActivities();
        
        alert('File shared successfully!');
      } else {
        throw new Error(response.data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to upload file'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileUrl, fileName) => {
    try {
      // Direct download from Supabase public URL
      window.open(fileUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleDownloadSubmission = async (submissionId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/files/download-submission/${submissionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading submission:', error);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) {
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
        
        alert('Assignment deleted successfully!');
      } else {
        throw new Error(response.data.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Error: ${error.response?.data?.error || error.message || 'Failed to delete file'}`);
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

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const renderFilePreview = (file) => {
    const fileType = file.mimeType?.split('/')[0] || '';
    const fileName = file.name || 'file';
    
    if (fileType === 'image') {
      return (
        <img 
          src={file.url} 
          alt={fileName}
          className="w-16 h-16 object-cover rounded"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtaW1hZ2UiPjcmIzQ3O3BhdGggZD0iTTE0LjUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjcuNUwxNC41IDJ6Ii8+PHBvbHlsaW5lIHBvaW50cz0iMTQgMiAxNCA4IDIwIDgiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7Y2lyY2xlIGN4PSIxNiIgY3k9IjEzIiByPSIvPiYjeDIwM2M7JiN4MjAzYzsmI3gyMDM7bC0zLjEtMy4xYTIgMiAwIDAgMC0yLjggMEw4IDE4Ii8+PC9zdmc+';
          }}
        />
      );
    }
    
    // Default file icon
    return (
      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
        <span className="text-2xl">📄</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Create Assignment Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Upload Learning Materials</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Learning Materials Title
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="Type Here..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={assignmentDescription}
              onChange={(e) => setAssignmentDescription(e.target.value)}
              placeholder="Type Here..."
              rows="3"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload File
            </label>
            <div className="flex items-center gap-4">
              <input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-purple-600 file:text-white
                  hover:file:bg-purple-700
                  cursor-pointer"
              />
              {selectedFile && (
                <span className="text-green-400 text-sm">
                  Selected: {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Share to Class
              </label>
              {classCodes.length === 0 ? (
                <div className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-gray-400">
                  <p>No classes available. Create a class first.</p>
                </div>
              ) : (
                <>
                  <select
                    value={shareToClassCode}
                    onChange={(e) => setShareToClassCode(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a class</option>
                    {classCodes.map((classItem) => (
                      <option key={classItem._id} value={classItem.classCode}>
                        {classItem.className} ({classItem.classCode})
                      </option>
                    ))}
                  </select>
                  {shareToClassCode && (
                    <p className="text-gray-400 text-sm mt-1">
                      Selected: {classCodes.find(c => c.classCode === shareToClassCode)?.className}
                    </p>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Submission Deadline (Optional)
              </label>
              <input
                type="datetime-local"
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !shareToClassCode || !assignmentTitle || classCodes.length === 0}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            title={classCodes.length === 0 ? 'Create a class first' : !selectedFile ? 'Select a file' : !shareToClassCode ? 'Select a class' : !assignmentTitle ? 'Enter assignment title' : ''}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Creating Assignment...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Create Assignment
              </>
            )}
          </button>
        </div>
      </div>

      {/* Your Assignments Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Shared Files</h3>
          <div className="flex items-center space-x-4">
            <div className="w-64 relative">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Filter by Class
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-1"
                />
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {filterClassCode && (
                <p className="text-gray-400 text-xs mt-1">
                  Showing files for: {classCodes.find(c => c.classCode === filterClassCode)?.className || filterClassCode}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file._id}
                className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${
                  selectedAssignment?._id === file._id ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {renderFilePreview(file)}
                      <div>
                        <h4 className="text-white font-medium">{file.assignmentTitle || 'Assignment'}</h4>
                        <p className="text-gray-400 text-sm">
                          Class: {file.classCode} • {formatFileSize(file.size || 0)}
                        </p>
                        {file.assignmentDescription && (
                          <p className="text-gray-500 text-sm mt-1">{file.assignmentDescription}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(file.uploadedAt || file.createdAt)}
                      </div>
                      {file.submissionDeadline && (
                        <div className={`flex items-center gap-1 ${isDeadlinePassed(file.submissionDeadline) ? 'text-red-400' : 'text-yellow-400'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Deadline: {formatDate(file.submissionDeadline)}
                          {isDeadlinePassed(file.submissionDeadline) && ' (Passed)'}
                        </div>
                      )}
                      <div className="text-blue-400">
                        {file.submissionCount || 0} submissions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDownload(file.url, file.originalName)}
                      className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => setSelectedAssignment(file)}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      View Submissions
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      disabled={deletingFiles[file._id]}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingFiles[file._id] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mx-auto"></div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400">No assignments created yet</p>
              <p className="text-gray-500 text-sm mt-1">Create an assignment to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Submissions Section */}
      {selectedAssignment && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Submissions for: {selectedAssignment.assignmentTitle}
            </h3>
            <button
              onClick={() => setSelectedAssignment(null)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {studentSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Student</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Submitted File</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Submission Date</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentSubmissions.map((submission) => (
                    <tr key={submission._id} className="border-b border-gray-700 hover:bg-gray-900/50">
                      <td className="py-3 px-4 text-white">
                        {submission.studentName || submission.student?.fullName}
                        {submission.studentEmail && (
                          <p className="text-gray-400 text-sm">{submission.studentEmail}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-700 rounded-lg">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="truncate max-w-xs">{submission.fileName || submission.file?.originalName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{formatDate(submission.submittedAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isDeadlinePassed(selectedAssignment.submissionDeadline) 
                            ? 'bg-red-900/30 text-red-400'
                            : new Date(submission.submittedAt) > new Date(selectedAssignment.submissionDeadline)
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-green-900/30 text-green-400'
                        }`}>
                          {isDeadlinePassed(selectedAssignment.submissionDeadline) 
                            ? 'Late'
                            : new Date(submission.submittedAt) > new Date(selectedAssignment.submissionDeadline)
                            ? 'Submitted Late'
                            : 'On Time'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadSubmission(submission._id, submission.fileName)}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-sm transition duration-200"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-400">No submissions yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Students can submit their work for this assignment
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activities Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Recent Activities</h3>
        
        <div className="space-y-4">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div
                key={index}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'assignment_upload' ? 'bg-purple-900/30' :
                    activity.type === 'submission' ? 'bg-green-900/30' :
                    activity.type === 'download' ? 'bg-blue-900/30' : 'bg-gray-700'
                  }`}>
                    {activity.type === 'assignment_upload' ? (
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    ) : activity.type === 'submission' ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.fileName}</p>
                    <p className="text-gray-400 text-sm">
                      {activity.type === 'assignment_upload' 
                        ? `Assignment created for ${activity.classCode}`
                        : activity.type === 'submission'
                        ? `Submitted by ${activity.studentName}`
                        : `Downloaded by ${activity.studentName || 'educator'}`}
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No recent activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileSharing;