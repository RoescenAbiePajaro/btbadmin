// src/components/student/StudentFileSharing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  useEffect(() => {
    if (student && student.enrolledClass) {
      fetchFiles();
      fetchMySubmissions();
      fetchRecentActivities();
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

  const fetchMySubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      // Since we don't have the my-submissions endpoint yet,
      // we'll get all submissions for now
      // In a real app, you'd have a separate endpoint for this
      const submissions = [];
      setMySubmissions(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      // Mock activities for now
      setRecentActivities([]);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !selectedAssignment) {
      alert('Please select a file and an assignment');
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('assignmentId', selectedAssignment._id);
      formData.append('studentId', student._id);
      formData.append('studentName', student.fullName);
      formData.append('studentEmail', student.email);
      formData.append('classCode', student.enrolledClass?.classCode || '');

      const response = await axios.post(
        'http://localhost:5000/api/files/submit-assignment',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        alert('Assignment submitted successfully!');
        setSelectedFile(null);
        setSelectedAssignment(null);
        setShowSubmitForm(false);
        document.getElementById('submissionFileInput').value = '';
        fetchFiles();
        fetchMySubmissions();
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(error.response?.data?.error || 'Error submitting assignment');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      // Direct download from Supabase public URL
      window.open(fileUrl, '_blank');
      
      // Log download activity
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/files/log-download',
        { fileId: fileName, studentId: student._id, studentName: student.fullName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchRecentActivities();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  // Filter assignments (files with type 'assignment')
  const assignments = files.filter(file => file.type === 'assignment');
  // Filter learning materials (files without type 'assignment')
  const learningMaterials = files.filter(file => file.type !== 'assignment');

  const hasSubmitted = (assignmentId) => {
    // Check if student has submitted this assignment
    return mySubmissions.some(sub => sub.assignmentId === assignmentId);
  };

  const getSubmissionStatus = (assignment) => {
    if (hasSubmitted(assignment._id)) {
      return { status: 'submitted', text: 'Submitted', color: 'bg-green-900/30 text-green-400' };
    }
    if (isDeadlinePassed(assignment.submissionDeadline)) {
      return { status: 'missed', text: 'Missed Deadline', color: 'bg-red-900/30 text-red-400' };
    }
    return { status: 'pending', text: 'Pending', color: 'bg-blue-900/30 text-blue-400' };
  };

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

      {/* Submit Assignment Form */}
      {showSubmitForm && selectedAssignment && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Submit: {selectedAssignment.assignmentTitle}
              </h3>
              {selectedAssignment.assignmentDescription && (
                <p className="text-gray-400 mt-1">{selectedAssignment.assignmentDescription}</p>
              )}
            </div>
            <button
              onClick={() => {
                setShowSubmitForm(false);
                setSelectedAssignment(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select File to Submit
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="submissionFileInput"
                  type="file"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    cursor-pointer"
                />
                {selectedFile && (
                  <div className="flex flex-col">
                    <span className="text-green-400 text-sm">
                      Selected: {selectedFile.name}
                    </span>
                    <span className="text-gray-400 text-xs">
                      Size: {formatFileSize(selectedFile.size)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {selectedAssignment.submissionDeadline && (
              <div className={`p-3 rounded-lg ${isDeadlinePassed(selectedAssignment.submissionDeadline) ? 'bg-red-900/30' : 'bg-yellow-900/30'}`}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={isDeadlinePassed(selectedAssignment.submissionDeadline) ? 'text-red-400' : 'text-yellow-400'}>
                    Deadline: {formatDate(selectedAssignment.submissionDeadline)}
                    {isDeadlinePassed(selectedAssignment.submissionDeadline) && ' (Passed)'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmitAssignment}
              disabled={uploading || !selectedFile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Assignment
                </>
              )}
            </button>
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
                className="bg-gray-900 border border-gray-700 rounded-lg p-4"
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
                        Posted: {formatDate(material.uploadedAt)}
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
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDownloadFile(material.url, material.originalName)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
                    >
                      <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Assignments Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Assignments
        </h3>
        
        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => {
              const status = getSubmissionStatus(assignment);
              return (
                <div
                  key={assignment._id}
                  className="bg-gray-900 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-900/30 rounded-lg">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{assignment.assignmentTitle}</h4>
                          {assignment.assignmentDescription && (
                            <p className="text-gray-400 text-sm mt-1">{assignment.assignmentDescription}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Posted: {formatDate(assignment.uploadedAt)}
                        </div>
                        {assignment.submissionDeadline && (
                          <div className={`flex items-center gap-1 ${isDeadlinePassed(assignment.submissionDeadline) ? 'text-red-400' : 'text-yellow-400'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Deadline: {formatDate(assignment.submissionDeadline)}
                            {isDeadlinePassed(assignment.submissionDeadline) && ' (Passed)'}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {formatFileSize(assignment.size)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadFile(assignment.url, assignment.originalName)}
                          className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-lg text-sm transition duration-200"
                        >
                          Download
                        </button>
                        {status.status !== 'submitted' && !isDeadlinePassed(assignment.submissionDeadline) && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowSubmitForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-sm transition duration-200"
                          >
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : !loading && (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <p className="text-gray-400">No assignments yet</p>
              <p className="text-gray-500 text-sm mt-1">Your educator will post assignments here</p>
            </div>
          )}
        </div>
      </div>

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
                    activity.type === 'submission' ? 'bg-green-900/30' :
                    activity.type === 'download' ? 'bg-blue-900/30' : 'bg-gray-700'
                  }`}>
                    {activity.type === 'submission' ? (
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
                      {activity.type === 'submission' 
                        ? `Assignment submitted`
                        : `File downloaded`}
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
              <p className="text-gray-500 text-sm mt-1">Your activities will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFileSharing;