// src/components/educator/StudentList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function StudentList() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

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
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Enrolled Students</h3>
          <p className="text-gray-400 text-sm">
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled in this class
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-400">Loading students...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">No students have joined this class yet.</div>
            <p className="text-gray-400 text-sm mt-2">
              Share the class code with your students so they can register.
            </p>
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
                {students.map((student) => (
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