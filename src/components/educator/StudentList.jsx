// src/components/educator/StudentList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';

const StudentList = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;
  const [classPage, setClassPage] = useState(1);
  const classItemsPerPage = 6;

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/my-classes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.data?.classes) {
        // Ensure classCode is present in all classes
        const classesWithCode = response.data.data.classes.map(cls => ({
          ...cls,
          classCode: cls.classCode || 'No code'
        }));
        setClasses(classesWithCode);
        if (classesWithCode.length > 0) {
          setSelectedClass(classesWithCode[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showToast('Failed to load classes', 'error');
    }
  };

  const fetchStudents = async (classId) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/${classId}/students`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data.data?.students) {
        setStudents(response.data.data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    }
  }, [selectedClass]);

  const getSelectedClassInfo = () => {
    return classes.find(c => c._id === selectedClass);
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handleCopyCode = (code) => {
    if (!code) {
      showToast('No class code available', 'error');
      return;
    }
    navigator.clipboard.writeText(code)
      .then(() => showToast('Class code copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy class code', 'error'));
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete || !selectedClass) return;
    
    console.log('Attempting to delete student:', {
      studentId: studentToDelete._id,
      classId: selectedClass,
      studentName: studentToDelete.fullName
    });
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      
      const response = await axios.delete(
        `http://localhost:5000/api/classes/${selectedClass}/students/${studentToDelete._id}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Delete response:', response.data);
      
      // Refresh the students list
      fetchStudents(selectedClass);
      showToast('Student removed from class successfully', 'success');
    } catch (error) {
      console.error('Error removing student:', error);
      console.error('Error response:', error.response?.data);
      showToast(
        error.response?.data?.toast?.message || 'Failed to remove student from class', 
        'error'
      );
    } finally {
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };

  const getFilteredStudents = () => {
    return students.filter(student => 
      searchTerm === '' || 
      student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPaginatedStudents = () => {
    const filtered = getFilteredStudents();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredStudents().length / itemsPerPage);
  };

  const getFilteredClasses = () => {
    return classes.filter(classItem =>
      classSearchTerm === '' ||
      classItem.className.toLowerCase().includes(classSearchTerm.toLowerCase()) ||
      classItem.classCode.toLowerCase().includes(classSearchTerm.toLowerCase())
    );
  };

  const getPaginatedClasses = () => {
    const filtered = getFilteredClasses();
    const startIndex = (classPage - 1) * classItemsPerPage;
    const endIndex = startIndex + classItemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalClassPages = () => {
    return Math.ceil(getFilteredClasses().length / classItemsPerPage);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, show: false }))} 
        />
      )}
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setStudentToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        deleteMode={studentToDelete ? 'single' : 'all'}
        isDeleting={loading}
      />
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Student Management</h2>
        <p className="text-gray-400">View and manage students in your classes</p>
      </div>

      {/* Class Selector */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <label className="block text-gray-300 text-sm font-medium mb-4">
          Select Class
        </label>
        
        {/* Search Bar for Classes */}
        <div className="relative w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="Search classes..."
            value={classSearchTerm}
            onChange={(e) => {
              setClassSearchTerm(e.target.value);
              setClassPage(1);
            }}
          />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {getPaginatedClasses().map((classItem) => (
            <button
              key={classItem._id}
              onClick={() => setSelectedClass(classItem._id)}
              className={`px-4 py-3 rounded-lg min-w-[200px] text-left transition duration-200 ${
                selectedClass === classItem._id
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div className="font-medium">{classItem.className}</div>
              <div className="flex items-center gap-2 text-sm opacity-80">
                {classItem.classCode || 'No code'}
                {classItem.classCode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(classItem.classCode);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Copy class code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="text-xs mt-2">
                {classItem.students?.length || 0} students
              </div>
            </button>
          ))}
        </div>
        
        {getFilteredClasses().length === 0 && classSearchTerm !== '' && (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No classes found matching "{classSearchTerm}"</p>
          </div>
        )}

        {/* Pagination Controls for Classes */}
        {getTotalClassPages() > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setClassPage(Math.max(1, classPage - 1))}
              disabled={classPage === 1}
              className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1">
              {Array.from({ length: getTotalClassPages() }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setClassPage(page)}
                  className={`px-2 py-1 rounded text-sm transition duration-200 ${
                    classPage === page
                      ? 'bg-pink-600 text-white'
                      : 'border border-gray-700 bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setClassPage(Math.min(getTotalClassPages(), classPage + 1))}
              disabled={classPage === getTotalClassPages()}
              className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="text-gray-400 text-xs ml-2">
              Page {classPage} of {getTotalClassPages()}
            </span>
          </div>
        )}
      </div>

      {/* Class Info */}
      {selectedClass && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Class Information</h3>
              <div className="space-y-2 text-gray-300">
                <div>
                  <span className="text-gray-400">Class Code:</span>{' '}
                  <span className="font-mono text-white">{getSelectedClassInfo()?.classCode}</span>
                  <button 
                    onClick={() => handleCopyCode(getSelectedClassInfo()?.classCode)}
                    className="text-gray-400 hover:text-white transition-colors ml-2"
                    title="Copy class code"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
                <div>
                  <span className="text-gray-400">Class Name:</span>{' '}
                  <span className="text-white">{getSelectedClassInfo()?.className}</span>
                </div>
                <div>
                  <span className="text-gray-400">Total Students:</span>{' '}
                  <span className="text-white">{students.length}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Batch</h3>
              <p className="text-gray-300">
                {getSelectedClassInfo()?.description || 'No description available'}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Actions</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleCopyCode(getSelectedClassInfo()?.classCode)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200 text-center"
                >
                  Copy Class Code
                </button>
                <button
                  className="bg-pink-600 hover:bg-pink-700 text-white py-2 px-4 rounded-lg transition duration-200 text-center"
                >
                  Export Student List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Enrolled Students</h3>
            <p className="text-gray-400 text-sm">
              {students.length} student{students.length !== 1 ? 's' : ''} enrolled in this class
            </p>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-400">Loading students...</div>
          </div>
        ) : getFilteredStudents().length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              {searchTerm 
                ? 'No students found matching your search.'
                : 'No students have joined this class yet.'}
            </div>
            {!searchTerm && (
              <p className="text-gray-400 text-sm mt-2">
                Share the class code with your students so they can register.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="text-left p-4 text-gray-400 font-medium">Full Name</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Username</th>
                    <th className="text-left p-4 text-gray-400 font-medium">School</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Course</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Year</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Block</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Joined Date</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {getPaginatedStudents().map((student) => (
                    <tr key={student._id} className="hover:bg-gray-750 transition duration-200">
                      <td className="p-4 text-white">{student.fullName}</td>
                      <td className="p-4 text-gray-300">{student.email}</td>
                      <td className="p-4 text-gray-300">{student.username}</td>
                      <td className="p-4 text-gray-300">{student.school || '-'}</td>
                      <td className="p-4 text-gray-300">{student.course || '-'}</td>
                      <td className="p-4 text-gray-300">{student.year || '-'}</td>
                      <td className="p-4 text-gray-300">{student.block || '-'}</td>
                      <td className="p-4 text-gray-300">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDeleteClick(student)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Remove from class"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {getTotalPages() > 1 && (
              <div className="p-6 border-t border-gray-700 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg transition duration-200 ${
                        currentPage === page
                          ? 'bg-pink-600 text-white'
                          : 'border border-gray-700 bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                  disabled={currentPage === getTotalPages()}
                  className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <span className="text-gray-400 text-sm ml-4">
                  Page {currentPage} of {getTotalPages()}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentList;