// src/components/educator/StudentSubmissions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Toast from '../Toast';

const StudentSubmissions = ({ educatorId }) => {
  const [classes, setClasses] = useState([]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  // Navigation State
  const [selectedClass, setSelectedClass] = useState(null); // Level 1 -> 2
  const [selectedFolder, setSelectedFolder] = useState(null); // Level 2 -> 3
  const [selectedFile, setSelectedFile] = useState(null); // Level 3 -> 4
  const [gradingSubmission, setGradingSubmission] = useState(null); // Level 5 (modal)
  const [gradingStudent, setGradingStudent] = useState(null);

  // Grading Form State
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  // UI States
  const [loading, setLoading] = useState({
    classes: false,
    folders: false,
    files: false,
    students: false
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // 1. Fetch Classes on Mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(prev => ({ ...prev, classes: true }));
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'https://btbtestservice.onrender.com/api/classes/my-classes',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.data?.classes) {
          setClasses(response.data.data.classes);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        showToast('Failed to load classes', 'error');
      } finally {
        setLoading(prev => ({ ...prev, classes: false }));
      }
    };
    fetchClasses();
  }, []);

  // 2. Fetch Folders when Class is Selected
  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedFolder(null);
    setSelectedFile(null);
    try {
      setLoading(prev => ({ ...prev, folders: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/folders?classCode=${cls.classCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setFolders(response.data.folders || []);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
      showToast('Failed to load class folders', 'error');
    } finally {
      setLoading(prev => ({ ...prev, folders: false }));
    }
  };

  // 3. Fetch Files when Folder is Selected
  const handleSelectFolder = async (folder) => {
    setSelectedFolder(folder);
    setSelectedFile(null);
    try {
      setLoading(prev => ({ ...prev, files: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/folders/${folder._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setFiles(response.data.folder?.files || []);
      }
    } catch (err) {
      console.error('Error fetching folder files:', err);
      showToast('Failed to load folder files', 'error');
    } finally {
      setLoading(prev => ({ ...prev, files: false }));
    }
  };

  // 4. Fetch Students and Submissions when File is Selected
  const handleSelectFile = async (file) => {
    setSelectedFile(file);
    try {
      setLoading(prev => ({ ...prev, students: true }));
      const token = localStorage.getItem('token');
      
      // Fetch students enrolled in this class
      const studentsResponse = await axios.get(
        `https://btbtestservice.onrender.com/api/classes/${selectedClass._id}/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch student submissions for this file
      const submissionsResponse = await axios.get(
        `https://btbtestservice.onrender.com/api/files/submissions/${file._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (studentsResponse.data.data?.students) {
        setStudents(studentsResponse.data.data.students);
      }
      if (submissionsResponse.data.success) {
        setSubmissions(submissionsResponse.data.submissions || []);
      }
    } catch (err) {
      console.error('Error loading file grading context:', err);
      showToast('Failed to load student lists or submissions', 'error');
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  };

  // 5. Open Grading Modal
  const handleViewSubmission = (student) => {
    setGradingStudent(student);
    const sub = submissions.find(
      s => (s.uploadedBy?._id || s.uploadedBy) === student._id
    );
    setGradingSubmission(sub || null);
    setScore(sub ? (sub.score !== null ? sub.score.toString() : '') : '');
    setFeedback(sub ? sub.feedback || '' : '');
  };

  // 6. Save Submission Grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    if (score.trim() === '') {
      showToast('Please enter a grade score', 'error');
      return;
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      showToast('Score must be a number between 0 and 100', 'error');
      return;
    }

    try {
      setSavingGrade(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `https://btbtestservice.onrender.com/api/files/score-submission/${gradingSubmission._id}`,
        { score: numericScore, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast('Submission graded successfully!', 'success');
        
        // Update local submissions list
        setSubmissions(prev => 
          prev.map(s => s._id === gradingSubmission._id ? response.data.submission : s)
        );

        setGradingSubmission(null);
        setGradingStudent(null);
      }
    } catch (err) {
      console.error('Error saving grade:', err);
      showToast('Failed to grade submission', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}

      {/* Navigation Breadcrumbs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-wrap items-center gap-2 text-sm text-gray-400">
        <button 
          onClick={() => { setSelectedClass(null); setSelectedFolder(null); setSelectedFile(null); }}
          className="hover:text-pink-400 font-medium transition-colors"
        >
          Classes
        </button>

        {selectedClass && (
          <>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button 
              onClick={() => { setSelectedFolder(null); setSelectedFile(null); }}
              className="hover:text-pink-400 font-medium transition-colors text-white"
            >
              {selectedClass.className}
            </button>
          </>
        )}

        {selectedFolder && (
          <>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button 
              onClick={() => setSelectedFile(null)}
              className="hover:text-pink-400 font-medium transition-colors text-white"
            >
              📁 {selectedFolder.name}
            </button>
          </>
        )}

        {selectedFile && (
          <>
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-300 font-medium truncate max-w-xs">
              📄 {selectedFile.title || selectedFile.originalName || selectedFile.name}
            </span>
          </>
        )}
      </div>

      {/* View 1: Classes Cards */}
      {!selectedClass && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Select a Class</h2>
            <p className="text-gray-400 text-sm">Choose a class to view folder submissions</p>
          </div>

          {loading.classes ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
              No classes created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => handleSelectClass(cls)}
                  className="bg-gray-800 border border-gray-700 hover:border-pink-500 rounded-xl p-6 text-left transition duration-200 transform hover:scale-[1.01] hover:shadow-lg hover:shadow-pink-500/5 group"
                >
                  <div className="text-xs font-bold text-pink-400 tracking-wider uppercase mb-1">
                    Class Code: {cls.classCode}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                    {cls.className}
                  </h3>
                  <div className="mt-4 pt-4 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
                    <span>Students Enrolled:</span>
                    <span className="font-semibold text-white">{cls.students?.length || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 2: Folders Cards */}
      {selectedClass && !selectedFolder && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Class Folders</h2>
            <p className="text-gray-400 text-sm">Select a folder to view assignments</p>
          </div>

          {loading.folders ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : folders.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
              No folders created in this class yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folders.map((folder) => (
                <button
                  key={folder._id}
                  onClick={() => handleSelectFolder(folder)}
                  className="bg-gray-800 border border-gray-700 hover:border-pink-500 rounded-xl p-6 text-left transition duration-200 transform hover:scale-[1.01] hover:shadow-lg hover:shadow-pink-500/5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white group-hover:text-pink-300 truncate" title={folder.name}>
                        {folder.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">Folder</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700/60 flex items-center justify-between text-xs text-gray-400">
                    <span>Students Enrolled:</span>
                    <span className="font-semibold text-white">{selectedClass.students?.length || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 3: Files (Assignments) List */}
      {selectedClass && selectedFolder && !selectedFile && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Shared Files in 📁 {selectedFolder.name}</h2>
            <p className="text-gray-400 text-sm">Click an assignment to view student submissions</p>
          </div>

          {loading.files ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
              No files shared in this folder yet.
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-700">
              {files.map((file) => (
                <button
                  key={file._id}
                  onClick={() => handleSelectFile(file)}
                  className="w-full p-4 text-left hover:bg-gray-750 transition duration-150 flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <svg className="w-6 h-6 text-pink-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="min-w-0">
                      <h4 className="text-white font-medium group-hover:text-pink-300 transition-colors truncate" title={file.title || file.originalName || file.name}>
                        {file.title || file.originalName || file.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Size: {formatFileSize(file.size)} • Uploaded: {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-pink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 4: Student Submissions Status List */}
      {selectedClass && selectedFolder && selectedFile && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Student Submissions</h2>
            <p className="text-gray-400 text-sm">
              Assignment: <span className="text-white font-semibold">{selectedFile.title || selectedFile.originalName || selectedFile.name}</span>
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
            <h3 className="text-md font-bold text-pink-400 uppercase tracking-wider">Assignment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Title</p>
                <p className="text-white font-medium text-sm mt-0.5">{selectedFile.title || "No Title Provided"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Original File</p>
                <p className="text-white text-sm mt-0.5 truncate" title={selectedFile.originalName || selectedFile.name}>
                  {selectedFile.originalName || selectedFile.name}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Instruction for Student</p>
              <p className="text-gray-300 text-sm mt-0.5 whitespace-pre-wrap">{selectedFile.instruction || "No Instructions Provided"}</p>
            </div>
          </div>

          {loading.students ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : students.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/60">
                    <tr>
                      <th className="text-left p-4 text-gray-400 font-medium text-sm">Student Name</th>
                      <th className="text-left p-4 text-gray-400 font-medium text-sm">Email</th>
                      <th className="text-left p-4 text-gray-400 font-medium text-sm">Submission Status</th>
                      <th className="text-left p-4 text-gray-400 font-medium text-sm">Grade Score</th>
                      <th className="text-left p-4 text-gray-400 font-medium text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {students.map((student) => {
                      const sub = submissions.find(
                        s => (s.uploadedBy?._id || s.uploadedBy) === student._id
                      );
                      const isGraded = sub && sub.score !== null && sub.score !== undefined;

                      return (
                        <tr key={student._id} className="hover:bg-gray-750/30 transition-colors">
                          <td className="p-4 text-white font-medium">{student.fullName}</td>
                          <td className="p-4 text-gray-400 text-sm">{student.email}</td>
                          <td className="p-4">
                            {sub ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/40 w-fit">
                                  Submitted
                                </span>
                                <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]" title={sub.originalName}>
                                  {sub.originalName}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/40">
                                No Submission
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isGraded ? (
                              <span className="text-green-400 font-bold text-sm">
                                {sub.score} / 100
                              </span>
                            ) : sub ? (
                              <span className="text-yellow-400 text-xs italic">Ungraded</span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {sub ? (
                              <button
                                onClick={() => handleViewSubmission(student)}
                                className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold transition duration-150 flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>
                            ) : (
                              <button
                                disabled
                                className="px-3.5 py-1.5 bg-gray-700 text-gray-500 rounded-lg text-xs font-semibold cursor-not-allowed"
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Level 5: Grading Detail Modal */}
      {gradingStudent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setGradingStudent(null); setGradingSubmission(null); }}>
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
              <div>
                <h3 className="text-lg font-bold text-white">Grade Student Submission</h3>
                <p className="text-xs text-gray-400 mt-1">Student: {gradingStudent.fullName}</p>
              </div>
              <button 
                onClick={() => { setGradingStudent(null); setGradingSubmission(null); }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-6">
              {gradingSubmission ? (
                <>
                  {/* File Metadata Card */}
                  <div className="bg-gray-900 border border-gray-750 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs text-pink-400 font-bold tracking-wider uppercase mb-1">Submitted File</p>
                      <h4 className="text-white font-medium text-sm truncate" title={gradingSubmission.originalName}>
                        {gradingSubmission.originalName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Size: {formatFileSize(gradingSubmission.size)} • Date: {formatDate(gradingSubmission.createdAt)}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => window.open(gradingSubmission.url, '_blank')}
                        className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-blue-450 hover:text-blue-400 rounded-lg transition-colors"
                        title="View File"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Grading Inputs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Grade Score (0 - 100) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="Enter score"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Educator Feedback (Optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Add comments or instructions for the student..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 h-28"
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setGradingStudent(null); setGradingSubmission(null); }}
                      className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-655 text-white rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingGrade}
                      className="flex-1 py-2.5 bg-pink-650 hover:bg-pink-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    >
                      {savingGrade ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Grade'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-gray-400">
                  No submission found for this student.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;
