// src/components/educator/ClassManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import Toast from '../Toast';

export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    className: '',
    description: '',
    school: '',
    course: '',
    year: '',
    block: '',
    isActive: true
  });
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [generateStartYear, setGenerateStartYear] = useState('');
  const [generateEndYear, setGenerateEndYear] = useState('');
  const [batchError, setBatchError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, a-z, z-a
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classToDelete, setClassToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Academic settings state
  const [academicSettings, setAcademicSettings] = useState({
    schools: [],
    courses: [],
    years: [],
    blocks: []
  });
  const [academicLoading, setAcademicLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    fetchAcademicSettings();
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
        // Backend should now return academic fields directly
        setClasses(response.data.data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showToast('Failed to load classes', 'error');
    }
  };

  const fetchAcademicSettings = async () => {
    try {
      setAcademicLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch all academic settings in parallel
      const [schoolsRes, coursesRes, yearsRes, blocksRes] = await Promise.all([
        axios.get('http://localhost:5000/api/academic-settings/school', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/academic-settings/course', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/academic-settings/year', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/academic-settings/block', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setAcademicSettings({
        schools: Array.isArray(schoolsRes.data) ? schoolsRes.data.filter(item => item.isActive) : [],
        courses: Array.isArray(coursesRes.data) ? coursesRes.data.filter(item => item.isActive) : [],
        years: Array.isArray(yearsRes.data) ? yearsRes.data.filter(item => item.isActive) : [],
        blocks: Array.isArray(blocksRes.data) ? blocksRes.data.filter(item => item.isActive) : []
      });
    } catch (error) {
      console.error('Error fetching academic settings:', error);
      showToast('Failed to load academic settings', 'error');
    } finally {
      setAcademicLoading(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
  };

  const handleGenerateCode = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.className.trim()) {
      showToast('Please enter a class name', 'error');
      return;
    }
    
    // Validate academic fields
    if (!formData.school || !formData.course || !formData.year || !formData.block) {
      showToast('Please select all academic fields (School, Course, Year, Block)', 'error');
      return;
    }
    
    // Validate batch information
    if (!generateStartYear || !generateEndYear) {
      setBatchError('Please select both start and end years for the batch');
      return;
    }
    
    if (parseInt(generateEndYear) <= parseInt(generateStartYear)) {
      setBatchError('End year must be after start year');
      return;
    }
    
    setLoading(true);
    setBatchError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        className: formData.className,
        description: generateStartYear && generateEndYear 
          ? `Batch ${generateStartYear} - ${generateEndYear}` 
          : formData.description,
        // Send academic fields to backend
        school: formData.school,
        course: formData.course,
        year: formData.year,
        block: formData.block
      };

      const response = await axios.post(
        `http://localhost:5000/api/classes/generate-code`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        const newClass = response.data.data.class;
        setClasses([newClass, ...classes]);
        setGeneratedCode(newClass.classCode);
        setShowModal(false);
        
        // Reset form data
        setFormData({
          className: '',
          description: '',
          school: '',
          course: '',
          year: '',
          block: ''
        });
        setGenerateStartYear('');
        setGenerateEndYear('');
        
        // Show success message
        showToast(`Class code generated: ${newClass.classCode}`, 'success');
      }
    } catch (error) {
      console.error('Error generating class code:', error);
      showToast(error.response?.data?.toast?.message || 'Failed to generate class code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    
    // Extract academic settings from class item
    const initialFormData = {
      className: classItem.className,
      description: classItem.description || '',
      school: classItem.school || '',
      course: classItem.course || '',
      year: classItem.year || '',
      block: classItem.block || '',
      isActive: classItem.isActive
    };
    
    // Extract years from description if it follows the pattern "Batch YYYY - YYYY"
    const yearMatch = classItem.description?.match(/Batch (\d{4}) - (\d{4})/);
    if (yearMatch) {
      setStartYear(yearMatch[1]);
      setEndYear(yearMatch[2]);
      initialFormData.description = `Batch ${yearMatch[1]} - ${yearMatch[2]}`;
    } else {
      setStartYear('');
      setEndYear('');
    }
    
    setFormData(initialFormData);
    setShowEditModal(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    if (!editingClass) return;
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const description = startYear && endYear 
        ? `Batch ${startYear} - ${endYear}` 
        : formData.description;
      
      const payload = {
        className: formData.className,
        description,
        // Send academic fields to backend
        school: formData.school,
        course: formData.course,
        year: formData.year,
        block: formData.block,
        isActive: formData.isActive
      };

      const response = await axios.put(
        `http://localhost:5000/api/classes/${editingClass._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        const updatedClass = response.data.data.class;
        setClasses(classes.map(cls => 
          cls._id === updatedClass._id ? updatedClass : cls
        ));
        setShowEditModal(false);
        setEditingClass(null);
        
        // Reset form data
        setFormData({
          className: '',
          description: '',
          school: '',
          course: '',
          year: '',
          block: ''
        });
        setStartYear('');
        setEndYear('');
        showToast('Class updated successfully!', 'success');
        
        // Refresh classes to ensure latest data
        fetchClasses();
      }
    } catch (error) {
      console.error('Error updating class:', error);
      showToast(error.response?.data?.toast?.message || 'Failed to update class', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = (classItem) => {
    setClassToDelete(classItem);
    setShowDeleteModal(true);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5000/api/classes/${classToDelete._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.data?.class) {
        setClasses(classes.filter(cls => cls._id !== classToDelete._id));
        showToast('Class deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showToast(error.response?.data?.toast?.message || 'Failed to delete class', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setClassToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowEditModal(false);
    setEditingClass(null);
    setFormData({
      className: '',
      description: '',
      school: '',
      course: '',
      year: '',
      block: ''
    });
    setStartYear('');
    setEndYear('');
    setGenerateStartYear('');
    setGenerateEndYear('');
    setBatchError('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Class code copied to clipboard!', 'success');
  };

  const getSortedAndFilteredClasses = () => {
    let filtered = classes.filter(classItem => {
      if (searchTerm === '') return true;
      
      const searchLower = searchTerm.toLowerCase();
      return (
        classItem.className.toLowerCase().includes(searchLower) ||
        classItem.classCode.toLowerCase().includes(searchLower) ||
        (classItem.description && classItem.description.toLowerCase().includes(searchLower)) ||
        (classItem.school && classItem.school.toLowerCase().includes(searchLower)) ||
        (classItem.course && classItem.course.toLowerCase().includes(searchLower)) ||
        (classItem.year && classItem.year.toLowerCase().includes(searchLower)) ||
        (classItem.block && classItem.block.toLowerCase().includes(searchLower))
      );
    });

    // Apply sorting
    switch(sortBy) {
      case 'a-z':
        return filtered.sort((a, b) => a.className.localeCompare(b.className));
      case 'z-a':
        return filtered.sort((a, b) => b.className.localeCompare(a.className));
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'newest':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const getPaginatedClasses = () => {
    const sorted = getSortedAndFilteredClasses();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sorted.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getSortedAndFilteredClasses().length / itemsPerPage);
  };

  // Render dropdown options
  const renderDropdown = (label, value, onChange, options, placeholder) => (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-2">
        {label} <span className="text-red-400">*</span>
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
        required
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map((option) => (
          <option key={option._id} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );

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
          setClassToDelete(null);
        }}
        onConfirm={confirmDeleteClass}
        deleteMode="all"
        isDeleting={isDeleting}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Class Codes</h2>
          <p className="text-gray-400">Create and manage your class codes</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200 hover:border-gray-600"
              placeholder="Search classes, school, course, year..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search classes"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative group">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-700 rounded-lg bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer transition-all duration-200 hover:border-gray-600 w-full sm:w-48"
                aria-label="Sort classes by"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="a-z">A to Z</option>
                <option value="z-a">Z to A</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 group-hover:text-white transition-colors duration-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-pink-600 hover:bg-pink-700 text-white py-2 px-6 rounded-lg transition duration-200 flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Generate New Class Code
          </button>
        </div>
      </div>

      {/* Classes Table - Shows academic info from database */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Class Name</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Class Code</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">School</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Course</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Year</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Block</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Batch</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Students</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {getSortedAndFilteredClasses().length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center">
                    <p className="text-gray-400">
                      {searchTerm ? `No classes found matching "${searchTerm}"` : 'No classes found'}
                    </p>
                  </td>
                </tr>
              ) : (
                getPaginatedClasses().map((classItem) => (
                  <tr key={classItem._id} className="hover:bg-gray-750 transition duration-200">
                    <td className="py-4 px-6">
                      <div className="font-medium text-white">{classItem.className}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300 font-mono">{classItem.classCode}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {classItem.school || <span className="text-gray-500 italic">Not set</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {classItem.course || <span className="text-gray-500 italic">Not set</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {classItem.year || <span className="text-gray-500 italic">Not set</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-300">
                        {classItem.block || <span className="text-gray-500 italic">Not set</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-gray-400 max-w-xs truncate" title={classItem.description || 'No Batch'}>
                        {classItem.description || 'No Batch'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">{classItem.students?.length || 0}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        classItem.isActive 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {classItem.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-3">
                        <button
                          onClick={() => copyToClipboard(classItem.classCode)}
                          className="text-blue-400 hover:text-blue-300 transition duration-200 p-1 rounded hover:bg-blue-500/10"
                          title="Copy Code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditClass(classItem)}
                          className="text-yellow-400 hover:text-yellow-300 transition duration-200 p-1 rounded hover:bg-yellow-500/10"
                          title="Edit Class"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClass(classItem)}
                          disabled={isDeleting}
                          className="text-red-400 hover:text-red-300 transition duration-200 p-1 rounded hover:bg-red-500/10 disabled:opacity-50"
                          title="Delete Class"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {getTotalPages() > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <div className="text-sm text-gray-400">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, getSortedAndFilteredClasses().length)} to {Math.min(currentPage * itemsPerPage, getSortedAndFilteredClasses().length)} of {getSortedAndFilteredClasses().length} classes
          </div>
          
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Class</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Class Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Computer Science 101"
                  required
                />
              </div>

              {/* Academic Settings Dropdowns - Pre-filled with class data */}
              <div className="grid grid-cols-2 gap-4">
                {renderDropdown(
                  "School", 
                  formData.school, 
                  (e) => setFormData({ ...formData, school: e.target.value }),
                  academicSettings.schools,
                  "Select School"
                )}
                {renderDropdown(
                  "Course", 
                  formData.course, 
                  (e) => setFormData({ ...formData, course: e.target.value }),
                  academicSettings.courses,
                  "Select Course"
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {renderDropdown(
                  "Year", 
                  formData.year, 
                  (e) => setFormData({ ...formData, year: e.target.value }),
                  academicSettings.years,
                  "Select Year"
                )}
                {renderDropdown(
                  "Block", 
                  formData.block, 
                  (e) => setFormData({ ...formData, block: e.target.value }),
                  academicSettings.blocks,
                  "Select Block"
                )}
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Start Year
                    </label>
                    <select
                      value={startYear}
                      onChange={(e) => {
                        const year = e.target.value;
                        setStartYear(year);
                        if (year && endYear) {
                          setFormData((prev) => ({
                            ...prev,
                            description: `Batch ${year} - ${endYear}`,
                          }));
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Select Start Year</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={`start-${year}`} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      End Year
                    </label>
                    <select
                      value={endYear}
                      onChange={(e) => {
                        const year = e.target.value;
                        setEndYear(year);
                        if (startYear && year) {
                          setFormData((prev) => ({
                            ...prev,
                            description: `Batch ${startYear} - ${year}`,
                          }));
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={!startYear}
                    >
                      <option value="">Select End Year</option>
                      {startYear &&
                        Array.from({ length: 6 }, (_, i) => {
                          const year = parseInt(startYear) + i + 1;
                          return (
                            <option key={`end-${year}`} value={year}>
                              {year}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Batch {startYear && endYear ? '(Auto-generated)' : ''}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => !(startYear && endYear) && setFormData({ ...formData, description: e.target.value })}
                    readOnly={!!(startYear && endYear)}
                    className={`w-full bg-gray-900 border ${
                      startYear && endYear 
                        ? 'border-gray-600 text-gray-400 bg-gray-800/50 cursor-not-allowed' 
                        : 'border-gray-700 text-white'
                    } rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-pink-500`}
                    style={{ minHeight: '100px' }}
                  />
                  {startYear && endYear && (
                    <div className="absolute right-3 top-9 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm font-medium">Status</span>
                  <span className={`px-2 py-1 rounded text-xs ${formData.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="px-3 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
                >
                  {formData.isActive ? 'Set Inactive' : 'Set Active'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition duration-200"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition duration-200 flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Class'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate Code Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Generate Class Code</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerateCode} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Class Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.className}
                  onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="e.g., Computer Science 101"
                  required
                />
              </div>

              {/* Academic Settings Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                {renderDropdown(
                  "School", 
                  formData.school, 
                  (e) => setFormData({ ...formData, school: e.target.value }),
                  academicSettings.schools,
                  "Select School"
                )}
                {renderDropdown(
                  "Course", 
                  formData.course, 
                  (e) => setFormData({ ...formData, course: e.target.value }),
                  academicSettings.courses,
                  "Select Course"
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {renderDropdown(
                  "Year", 
                  formData.year, 
                  (e) => setFormData({ ...formData, year: e.target.value }),
                  academicSettings.years,
                  "Select Year"
                )}
                {renderDropdown(
                  "Block", 
                  formData.block, 
                  (e) => setFormData({ ...formData, block: e.target.value }),
                  academicSettings.blocks,
                  "Select Block"
                )}
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Start Year <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={generateStartYear}
                      onChange={(e) => {
                        const year = e.target.value;
                        setGenerateStartYear(year);
                        if (year && generateEndYear) {
                          setFormData((prev) => ({
                            ...prev,
                            description: `Batch ${year} - ${generateEndYear}`,
                          }));
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    >
                      <option value="">Select Start Year</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <option key={`gen-start-${year}`} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      End Year <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={generateEndYear}
                      onChange={(e) => {
                        const year = e.target.value;
                        setGenerateEndYear(year);
                        if (generateStartYear && year) {
                          setFormData((prev) => ({
                            ...prev,
                            description: `Batch ${generateStartYear} - ${year}`,
                          }));
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      disabled={!generateStartYear}
                      required
                    >
                      <option value="">Select End Year</option>
                      {generateStartYear &&
                        Array.from({ length: 6 }, (_, i) => {
                          const year = parseInt(generateStartYear) + i + 1;
                          return (
                            <option key={`gen-end-${year}`} value={year}>
                              {year}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Batch {generateStartYear && generateEndYear ? '(Auto-generated)' : ''}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full bg-gray-900 border ${
                    generateStartYear && generateEndYear
                      ? 'border-gray-600 text-gray-400'
                      : 'border-gray-700 text-white'
                  } rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500`}
                  rows="2"
                  placeholder={
                    generateStartYear && generateEndYear
                      ? `Batch ${generateStartYear} - ${generateEndYear}`
                      : "Enter batch information or use the year selectors above"
                  }
                  readOnly={!!(generateStartYear && generateEndYear)}
                />
                {batchError && (
                  <p className="mt-2 text-sm text-red-400">{batchError}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.className.trim() || !generateStartYear || !generateEndYear || !formData.school || !formData.course || !formData.year || !formData.block}
                  className={`flex-1 ${
                    !formData.className.trim() || !generateStartYear || !generateEndYear || !formData.school || !formData.course || !formData.year || !formData.block
                      ? 'bg-pink-600/50 cursor-not-allowed'
                      : 'bg-pink-600 hover:bg-pink-700'
                  } text-white py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate Code'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}