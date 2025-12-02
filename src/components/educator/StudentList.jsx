// src/components/educator/StudentList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentList() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
        setClasses(response.data.data.classes);
        if (response.data.data.classes.length > 0) {
          setSelectedClass(response.data.data.classes[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchStudents = async (classId) => {
    setLoading(true);
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

  return (
    <div className="space-y-6">
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
        <div className="flex gap-4 overflow-x-auto pb-2">
          {classes.map((classItem) => (
            <button
              key={classItem._id}
              onClick={() => setSelectedClass(classItem._id)}
              className={`px-4 py-3 rounded-lg min-w-[200px] text-left transition duration-200 ${
                selectedClass === classItem._id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div className="font-medium">{classItem.className}</div>
              <div className="text-sm opacity-80">{classItem.classCode}</div>
              <div className="text-xs mt-2">
                {classItem.students?.length || 0} students
              </div>
            </button>
          ))}
        </div>
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
              <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
              <p className="text-gray-300">
                {getSelectedClassInfo()?.description || 'No description available'}
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Actions</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(getSelectedClassInfo()?.classCode)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-200 text-center"
                >
                  Copy Class Code
                </button>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition duration-200 text-center"
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-400">Loading students...</div>
          </div>
        ) : students.filter(student => 
            searchTerm === '' || 
            student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.username?.toLowerCase().includes(searchTerm.toLowerCase())
          ).length === 0 ? (
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left p-4 text-gray-400 font-medium">Full Name</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Username</th>
                  <th className="text-left p-4 text-gray-400 font-medium">School</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Department</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Year</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Block</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {students
                  .filter(student => 
                    searchTerm === '' || 
                    student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    student.username?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((student) => (
                  <tr key={student._id} className="hover:bg-gray-750 transition duration-200">
                    <td className="p-4 text-white">{student.fullName}</td>
                    <td className="p-4 text-gray-300">{student.email}</td>
                    <td className="p-4 text-gray-300">{student.username}</td>
                    <td className="p-4 text-gray-300">{student.school || '-'}</td>
                    <td className="p-4 text-gray-300">{student.department || '-'}</td>
                    <td className="p-4 text-gray-300">{student.year || '-'}</td>
                    <td className="p-4 text-gray-300">{student.block || '-'}</td>
                    <td className="p-4 text-gray-300">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}