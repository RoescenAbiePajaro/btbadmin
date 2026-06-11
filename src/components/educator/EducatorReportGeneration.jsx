import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FiSearch, FiBook, FiFileText, FiDownload,
  FiFilter, FiActivity, FiUsers, FiCalendar, FiClock, FiAlertCircle
} from 'react-icons/fi';
import ExportModal from '../admin/ExportModal.jsx';
import { handleExport } from '../../utils/exportUtils.js';

export default function EducatorReportGeneration() {
  const [classes, setClasses] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reportType, setReportType] = useState('class-centric'); // 'class-centric' or 'file-centric'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch educator classes
      const classesRes = await axios.get(
        'https://btbtestservice.onrender.com/api/classes/my-classes',
        { headers }
      );

      // Fetch educator files
      const filesRes = await axios.get(
        'https://btbtestservice.onrender.com/api/files/list',
        { headers }
      );

      if (classesRes.data.data?.classes) {
        setClasses(classesRes.data.data.classes);
      } else if (classesRes.data.classes) {
        setClasses(classesRes.data.classes);
      }

      if (filesRes.data.success && filesRes.data.files) {
        setFiles(filesRes.data.files);
      }
    } catch (err) {
      console.error('Error fetching educator report data:', err);
      setError('Failed to load report data. Please refresh or try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Class-centric dataset
  const classCentricData = useMemo(() => {
    return classes.map(cls => {
      const classFiles = files.filter(f => f.classCode === cls.classCode);
      const filesCount = classFiles.length;
      const filesList = classFiles.map(f => f.name || f.originalName).join(', ') || '';

      return {
        id: cls._id || Math.random().toString(),
        classCode: cls.classCode || 'N/A',
        className: cls.className || 'N/A',
        course: cls.course || 'N/A',
        year: cls.year || 'N/A',
        block: cls.block || 'N/A',
        description: cls.description || 'N/A',
        school: cls.school || 'Not specified',
        studentsCount: cls.students?.length || 0,
        filesCount,
        filesList,
        isActive: cls.isActive ?? true,
        createdAt: cls.createdAt
      };
    });
  }, [classes, files]);

  // File-centric dataset
  const fileCentricData = useMemo(() => {
    return files.map(file => {
      const classItem = classes.find(c => c.classCode === file.classCode);
      return {
        id: file._id || Math.random().toString(),
        fileName: file.name || file.originalName || 'N/A',
        fileSize: file.size || 0,
        fileType: file.mimeType || file.type || 'N/A',
        uploadedAt: file.createdAt || file.uploadedAt,
        classCode: file.classCode || 'N/A',
        className: classItem?.className || 'N/A',
        school: classItem?.school || 'Not specified',
        studentsCount: classItem?.students?.length || 0
      };
    });
  }, [files, classes]);

  // Apply filters
  const filteredData = useMemo(() => {
    if (reportType === 'class-centric') {
      return classCentricData.filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = [
            item.classCode,
            item.className,
            item.school,
            item.course,
            item.filesList
          ].filter(Boolean).join(' ').toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedClassFilter && item.classCode !== selectedClassFilter) return false;
        if (startDate || endDate) {
          if (!item.createdAt) return false;
          const date = new Date(item.createdAt);
          if (startDate && date < new Date(startDate)) return false;
          if (endDate && date > new Date(endDate + 'T23:59:59')) return false;
        }
        return true;
      });
    } else {
      return fileCentricData.filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = [
            item.fileName,
            item.classCode,
            item.className,
            item.school,
            item.fileType
          ].filter(Boolean).join(' ').toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedClassFilter && item.classCode !== selectedClassFilter) return false;
        if (startDate || endDate) {
          if (!item.uploadedAt) return false;
          const date = new Date(item.uploadedAt);
          if (startDate && date < new Date(startDate)) return false;
          if (endDate && date > new Date(endDate + 'T23:59:59')) return false;
        }
        return true;
      });
    }
  }, [reportType, classCentricData, fileCentricData, searchQuery, selectedClassFilter, startDate, endDate]);

  // Calculate statistics for dynamic cards
  const stats = useMemo(() => {
    if (reportType === 'class-centric') {
      const totalClasses = filteredData.length;
      const totalStudents = filteredData.reduce((sum, item) => sum + item.studentsCount, 0);
      const totalFiles = filteredData.reduce((sum, item) => sum + item.filesCount, 0);
      return { totalClasses, totalStudents, totalFiles };
    } else {
      const uniqueClassCodes = Array.from(new Set(filteredData.map(item => item.classCode)));
      const totalClasses = uniqueClassCodes.length;
      const totalStudents = uniqueClassCodes.reduce((sum, code) => {
        const cls = classes.find(c => c.classCode === code);
        return sum + (cls?.students?.length || 0);
      }, 0);
      const totalFiles = filteredData.length;
      return { totalClasses, totalStudents, totalFiles };
    }
  }, [filteredData, reportType, classes]);

  // Pagination calculations
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedClassFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleExportClick = (format) => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = reportType === 'class-centric' ? [
      { key: 'classCode', label: 'Class Code' },
      { key: 'className', label: 'Class Name' },
      { key: 'school', label: 'School' },
      { key: 'course', label: 'Course' },
      { key: 'year', label: 'Year' },
      { key: 'block', label: 'Block' },
      { key: 'description', label: 'Batch/Description' },
      { key: 'studentsCount', label: 'Students Enrolled' },
      { key: 'filesCount', label: 'Files Uploaded' },
      { key: 'filesList', label: 'File Names' },
      { key: 'status', label: 'Status' }
    ] : [
      { key: 'fileName', label: 'File Name' },
      { key: 'fileSizeFormatted', label: 'File Size' },
      { key: 'fileType', label: 'File Type' },
      { key: 'uploadedDate', label: 'Upload Date' },
      { key: 'classCode', label: 'Class Code' },
      { key: 'className', label: 'Class Name' },
      { key: 'school', label: 'School' },
      { key: 'studentsCount', label: 'Enrolled Students' }
    ];

    const data = reportType === 'class-centric'
      ? filteredData.map(item => ({
        classCode: item.classCode,
        className: item.className,
        school: item.school,
        course: item.course,
        year: item.year,
        block: item.block,
        description: item.description || 'N/A',
        studentsCount: item.studentsCount,
        filesCount: item.filesCount,
        filesList: item.filesList || 'N/A',
        status: item.isActive ? 'Active' : 'Inactive'
      }))
      : filteredData.map(item => ({
        fileName: item.fileName,
        fileSizeFormatted: formatFileSize(item.fileSize),
        fileType: item.fileType,
        uploadedDate: item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'N/A',
        classCode: item.classCode,
        className: item.className,
        school: item.school,
        studentsCount: item.studentsCount
      }));

    const filename = reportType === 'class-centric' ? 'my_classes_report' : 'my_uploads_report';
    handleExport(format, data, headers, filename);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500 mb-4"></div>
        <p className="text-gray-400">Loading report data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-white">
        <FiAlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="font-semibold text-lg">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Title section and selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Report Generation</h2>
          <p className="text-gray-400 text-sm">Visualize and export enrollment and uploaded learning material lists</p>
        </div>

        {/* Report Type Selector */}
        <div className="flex bg-gray-800 p-1 border border-gray-700 rounded-lg">
          <button
            onClick={() => {
              setReportType('class-centric');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${reportType === 'class-centric'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/10'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            Class-Centric Summary
          </button>
          <button
            onClick={() => {
              setReportType('file-centric');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${reportType === 'file-centric'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/10'
                : 'text-gray-400 hover:text-white'
              }`}
          >
            File-Centric Uploads
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Classes</p>
            <p className="text-3xl font-bold mt-2 text-pink-400">{stats.totalClasses}</p>
          </div>
          <FiBook className="w-10 h-10 text-pink-500/20" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Total Students</p>
            <p className="text-3xl font-bold mt-2 text-green-400">{stats.totalStudents}</p>
          </div>
          <FiUsers className="w-10 h-10 text-green-500/20" />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Shared Files</p>
            <p className="text-3xl font-bold mt-2 text-blue-400">{stats.totalFiles}</p>
          </div>
          <FiActivity className="w-10 h-10 text-blue-500/20" />
        </div>
      </div>

      {/* Control Filters panel */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <FiFilter className="text-pink-400" />
            <h4 className="font-semibold text-white">Filter Controls</h4>
          </div>
          <button
            onClick={resetFilters}
            className="text-sm text-pink-400 hover:text-pink-300 font-medium transition"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search Box */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Search Keywords</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={reportType === 'class-centric' ? "Code, name, school..." : "Filename, code, type..."}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm placeholder-gray-500"
              />
            </div>
          </div>

          {/* Class Select Dropdown */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Filter by Class Code</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls._id} value={cls.classCode}>
                  {cls.className} ({cls.classCode})
                </option>
              ))}
            </select>
          </div>

          {/* Date range helpers */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Date Target Info</label>
            <div className="text-xs text-gray-500 py-2">
              Use date filters below to narrow results
            </div>
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {reportType === 'class-centric' ? 'Class Created After' : 'File Uploaded After'}
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {reportType === 'class-centric' ? 'Class Created Before' : 'File Uploaded Before'}
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FiClock className="text-pink-400" />
            <h3 className="font-semibold text-white">Report Preview ({filteredData.length} records)</h3>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-pink-600 hover:bg-pink-750 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition duration-200 text-sm font-semibold shadow-md shadow-pink-600/10 self-end sm:self-auto"
            disabled={filteredData.length === 0}
          >
            <FiDownload className="w-4 h-4" /> Export Report
          </button>
        </div>

        {/* Data Table */}
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400">
                {reportType === 'class-centric' ? (
                  <tr>
                    <th className="px-4 py-3">Class Code</th>
                    <th className="px-4 py-3">Class Name</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Course Info</th>
                    <th className="px-4 py-3 text-center">Enrolled Students</th>
                    <th className="px-4 py-3 text-center">Shared Files</th>
                    <th className="px-4 py-3">File Names</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Upload Date</th>
                    <th className="px-4 py-3">Class Code</th>
                    <th className="px-4 py-3">Class Name</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3 text-center">Enrolled Students</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-gray-700">
                {reportType === 'class-centric' ? (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/50 transition duration-150">
                      <td className="px-4 py-4 font-mono font-bold text-pink-300">{item.classCode}</td>
                      <td className="px-4 py-4 font-medium text-white">{item.className}</td>
                      <td className="px-4 py-4 text-xs text-gray-400">{item.school}</td>
                      <td className="px-4 py-4 text-xs text-gray-300">
                        <div>{item.course}</div>
                        <div className="text-gray-500">Year {item.year} - Block {item.block}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                          {item.studentsCount} students
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                          {item.filesCount} files
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 max-w-xs truncate" title={item.filesList}>
                        {item.filesList || <span className="text-gray-600 italic">No files shared</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${item.isActive ? 'bg-green-500/25 text-green-400' : 'bg-red-500/25 text-red-400'
                          }`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-700/50 transition duration-150">
                      <td className="px-4 py-4 text-sm font-semibold text-white truncate max-w-xs" title={item.fileName}>
                        {item.fileName}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 whitespace-nowrap">
                        {formatFileSize(item.fileSize)}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-300 whitespace-nowrap">
                        {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-pink-300">{item.classCode}</td>
                      <td className="px-4 py-4 text-sm">{item.className}</td>
                      <td className="px-4 py-4 text-xs text-gray-400">{item.school}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="bg-green-500/20 text-green-400 px-2.5 py-1 rounded text-xs">
                          {item.studentsCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FiAlertCircle className="w-12 h-12 mb-3 text-gray-600" />
            <p className="font-semibold text-white">No data matches current filters</p>
            <p className="text-sm">Try resetting filters or changing your queries.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-750 mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg transition duration-200 text-sm font-semibold ${currentPage === page
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/10'
                      : 'border border-gray-700 bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-700 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className="text-gray-400 text-sm ml-4">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Export Modal component */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportClick}
        title={reportType === 'class-centric' ? 'Export Class Enrollment Summary' : 'Export File Uploads Report'}
      />
    </div>
  );
}
