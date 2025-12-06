// src/components/student/StudentFileSharing.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentFileSharing = ({ student }) => {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [selectedClass, setSelectedClass] = useState(student?.enrolledClassDetails?._id || null);
  const [selectedClassCode, setSelectedClassCode] = useState(student?.enrolledClassDetails?.classCode || '');

  // Handle class selection
  const handleClassSelect = (classId, classCode) => {
    setSelectedClass(classId);
    setSelectedClassCode(classCode);
    // Store in sessionStorage for persistence
    sessionStorage.setItem('selectedClassCode', classCode);
  };

  useEffect(() => {
    // Initialize with student's enrolled class by default
    if (student?.enrolledClassDetails) {
      handleClassSelect(student.enrolledClassDetails._id, student.enrolledClassDetails.classCode);
    }
  }, [student]);

  useEffect(() => {
    if (selectedClassCode) {
      fetchAssignments();
      fetchMySubmissions();
      fetchRecentActivities();
    }
  }, [selectedClassCode]);

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/assignments/${selectedClassCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchMySubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/my-submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMySubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Error fetching my submissions:', error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/student-activities`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecentActivities(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
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

    // Check if deadline has passed
    if (selectedAssignment.submissionDeadline && new Date(selectedAssignment.submissionDeadline) < new Date()) {
      if (!window.confirm('The submission deadline has passed. Do you still want to submit? This will be marked as late.')) {
        return;
      }
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
      formData.append('classCode', student.enrolledClassDetails.classCode);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/submit-assignment`,
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
        document.getElementById('submissionFileInput').value = '';
        fetchAssignments();
        fetchMySubmissions();
        fetchRecentActivities();
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Error submitting assignment');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAssignment = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/download/${fileId}`,
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

      // Log download activity
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/log-download`,
        { fileId, studentId: student._id, studentName: student.fullName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchRecentActivities();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDownloadMySubmission = async (submissionId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/files/download-submission/${submissionId}`,
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

  const hasSubmitted = (assignmentId) => {
    return mySubmissions.some(sub => sub.assignmentId === assignmentId);
  };

  const getSubmissionStatus = (assignment) => {
    if (hasSubmitted(assignment._id)) {
      const submission = mySubmissions.find(sub => sub.assignmentId === assignment._id);
      if (assignment.submissionDeadline && new Date(submission.submittedAt) > new Date(assignment.submissionDeadline)) {
        return { status: 'submitted_late', text: 'Submitted Late', color: 'bg-yellow-900/30 text-yellow-400' };
      }
      return { status: 'submitted', text: 'Submitted', color: 'bg-green-900/30 text-green-400' };
    }
    if (isDeadlinePassed(assignment.submissionDeadline)) {
      return { status: 'missed', text: 'Missed Deadline', color: 'bg-red-900/30 text-red-400' };
    }
    return { status: 'pending', text: 'Pending', color: 'bg-blue-900/30 text-blue-400' };
  };

  return (
    <div className="space-y-8">
      {/* Submit Assignment Section */}
      {selectedAssignment && (
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
              onClick={() => setSelectedAssignment(null)}
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

      {/* Assignments from Educator */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          Learning Materials from Educator
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
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {formatFileSize(assignment.fileSize)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${status.color}`}>
                        {status.text}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadAssignment(assignment._id, assignment.fileName)}
                          className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-lg text-sm transition duration-200"
                        >
                          Download
                        </button>
                        {status.status !== 'submitted' && !isDeadlinePassed(assignment.submissionDeadline) && (
                          <button
                            onClick={() => setSelectedAssignment(assignment)}
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
          ) : (
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

      {/* My Submissions Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">
          My Submissions
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Assignment</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Submitted File</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Submission Date</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.length > 0 ? (
                mySubmissions.map((submission) => {
                  const assignment = assignments.find(a => a._id === submission.assignmentId);
                  const isLate = assignment?.submissionDeadline && 
                                new Date(submission.submittedAt) > new Date(assignment.submissionDeadline);
                  
                  return (
                    <tr key={submission._id} className="border-b border-gray-700 hover:bg-gray-900/50">
                      <td className="py-3 px-4 text-white">
                        {assignment?.assignmentTitle || 'Assignment'}
                      </td>
                      <td className="py-3 px-4 text-white">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-700 rounded-lg">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="truncate max-w-xs">{submission.fileName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{formatDate(submission.submittedAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isLate ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'
                        }`}>
                          {isLate ? 'Submitted Late' : 'Submitted'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadMySubmission(submission._id, submission.fileName)}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-sm transition duration-200"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-400">
                    No submissions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                        ? `Submitted for assignment`
                        : `Downloaded assignment`}
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

export default StudentFileSharing;