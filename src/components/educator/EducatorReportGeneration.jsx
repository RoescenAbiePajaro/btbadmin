import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  FiSearch, FiBook, FiFileText, FiDownload,
  FiFilter, FiActivity, FiUsers, FiCalendar, FiClock, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiAward
} from 'react-icons/fi';
import ExportModal from '../admin/ExportModal.jsx';
import { handleExport } from '../../utils/exportUtils.js';

const API_BASE = 'https://btbtestservice.onrender.com/api';

export default function EducatorReportGeneration() {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Submission report state ───────────────────────────────────────────────
  const [submissionReportData, setSubmissionReportData] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionReportLoaded, setSubmissionReportLoaded] = useState(false);
  const [submissionLoadError, setSubmissionLoadError] = useState(null);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState('class-centric');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Initial data fetch ────────────────────────────────────────────────────
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

      const [classesRes, filesRes] = await Promise.all([
        axios.get(`${API_BASE}/classes/my-classes`, { headers }),
        axios.get(`${API_BASE}/files/list`, { headers })
      ]);

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

  // ── Submission report loader ───────────────────────────────────────────────
  const fetchSubmissionReport = useCallback(async () => {
    if (submissionReportLoaded) return;
    try {
      setLoadingSubmissions(true);
      setSubmissionLoadError(null);
      const token = localStorage.getItem('token');
      const authHeaders = { Authorization: `Bearer ${token}` };

      // We need: classes, their students, folders, and submissions per file
      const classData = classes.length > 0 ? classes : [];
      if (classData.length === 0) {
        setSubmissionReportData([]);
        setSubmissionReportLoaded(true);
        return;
      }

      // Material files only
      const materialFiles = files.filter(f => f.type !== 'submission');

      // 1. Fetch folders for all classes in parallel
      const foldersByClass = {};
      await Promise.allSettled(
        classData.map(async (cls) => {
          try {
            const res = await axios.get(`${API_BASE}/folders?classCode=${cls.classCode}`, { headers: authHeaders });
            if (res.data.success) {
              foldersByClass[cls.classCode] = res.data.folders || [];
            }
          } catch { /* ignore */ }
        })
      );

      // Build folder lookup by folderId
      const folderMap = {};
      Object.values(foldersByClass).forEach(foldersArr => {
        foldersArr.forEach(f => { folderMap[f._id?.toString()] = f.name || '(No Folder)'; });
      });

      // 2. Fetch students for all classes in parallel
      const studentsByClass = {};
      await Promise.allSettled(
        classData.map(async (cls) => {
          try {
            const res = await axios.get(`${API_BASE}/classes/${cls._id}/students`, { headers: authHeaders });
            if (res.data.data?.students) {
              studentsByClass[cls.classCode] = res.data.data.students;
            }
          } catch { /* ignore */ }
        })
      );

      // 3. Fetch submissions for each material file in parallel
      const submissionsByFile = {};
      await Promise.allSettled(
        materialFiles.map(async (file) => {
          try {
            const res = await axios.get(`${API_BASE}/files/submissions/${file._id}`, { headers: authHeaders });
            if (res.data.success) {
              submissionsByFile[file._id?.toString()] = res.data.submissions || [];
            }
          } catch { /* ignore */ }
        })
      );

      // 4. Build flat rows: one per student × assignment
      const rows = [];
      for (const cls of classData) {
        const students = studentsByClass[cls.classCode] || [];
        const clsFiles = materialFiles.filter(f => f.classCode === cls.classCode);

        for (const file of clsFiles) {
          const fileId = file._id?.toString();
          const folderName = file.folderId
            ? (folderMap[file.folderId?.toString()] || 'Unknown Folder')
            : '— (No Folder)';
          const subs = submissionsByFile[fileId] || [];

          for (const student of students) {
            const sub = subs.find(
              s => (s.uploadedBy?._id || s.uploadedBy)?.toString() === student._id?.toString()
            );

            const hasSubmission = !!sub;
            const isGraded = hasSubmission && sub.score !== null && sub.score !== undefined;

            rows.push({
              // Context
              classCode: cls.classCode || 'N/A',
              className: cls.className || 'N/A',
              folderName,

              // Teacher file info
              assignmentTitle: file.title || file.originalName || 'N/A',
              teacherFileName: file.originalName || file.name || 'N/A',
              teacherUploadDate: file.createdAt
                ? new Date(file.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A',

              // Student info
              studentName: student.fullName || 'N/A',
              studentEmail: student.email || 'N/A',

              // Submission info
              submissionStatus: hasSubmission ? 'Submitted' : 'No Submission',
              submittedFileName: hasSubmission ? (sub.originalName || 'N/A') : '—',
              submissionDate: hasSubmission && sub.createdAt
                ? new Date(sub.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—',
              submittedFileSize: hasSubmission && sub.size ? formatFileSize(sub.size) : '—',

              // Grade
              gradeScore: isGraded ? sub.score : (hasSubmission ? 'Ungraded' : '—'),
              educatorFeedback: (hasSubmission && sub.feedback) ? sub.feedback : '—',

              // For internal use
              _hasSubmission: hasSubmission,
              _isGraded: isGraded,
              _score: isGraded ? sub.score : null,
              _fileId: fileId,
              _classCode: cls.classCode
            });
          }
        }
      }

      setSubmissionReportData(rows);
      setSubmissionReportLoaded(true);
    } catch (err) {
      console.error('Error building submission report:', err);
      setSubmissionLoadError('Failed to load submission data. Please try again.');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [classes, files, submissionReportLoaded]);

  // Trigger submission report load when tab is first selected
  useEffect(() => {
    if (reportType === 'submission-report' && !submissionReportLoaded && !loadingSubmissions && classes.length > 0) {
      fetchSubmissionReport();
    }
  }, [reportType, submissionReportLoaded, loadingSubmissions, classes, fetchSubmissionReport]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ── Class-Centric dataset ─────────────────────────────────────────────────
  const classCentricData = useMemo(() => {
    return classes.map(cls => {
      const classFiles = files.filter(f => f.classCode === cls.classCode);
      const filesCount = classFiles.length;
      const filesArray = classFiles.map(f => f.name || f.originalName);
      const filesList = filesArray.join(', ') || '';

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
        filesArray,
        isActive: cls.isActive ?? true,
        createdAt: cls.createdAt
      };
    });
  }, [classes, files]);

  // ── File-Centric dataset ──────────────────────────────────────────────────
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

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const applyDateFilter = (dateStr) => {
      if (!startDate && !endDate) return true;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      if (startDate && date < new Date(startDate)) return false;
      if (endDate && date > new Date(endDate + 'T23:59:59')) return false;
      return true;
    };

    if (reportType === 'class-centric') {
      return classCentricData.filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = [item.classCode, item.className, item.school, item.course, item.filesList]
            .filter(Boolean).join(' ').toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedClassFilter && item.classCode !== selectedClassFilter) return false;
        if (!applyDateFilter(item.createdAt)) return false;
        return true;
      });
    } else if (reportType === 'file-centric') {
      return fileCentricData.filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = [item.fileName, item.classCode, item.className, item.school, item.fileType]
            .filter(Boolean).join(' ').toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedClassFilter && item.classCode !== selectedClassFilter) return false;
        if (!applyDateFilter(item.uploadedAt)) return false;
        return true;
      });
    } else {
      // submission-report
      return submissionReportData.filter(item => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matches = [
            item.classCode, item.className, item.folderName,
            item.assignmentTitle, item.studentName, item.studentEmail,
            item.submissionStatus, item.submittedFileName
          ].filter(Boolean).join(' ').toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedClassFilter && item.classCode !== selectedClassFilter) return false;
        return true;
      });
    }
  }, [reportType, classCentricData, fileCentricData, submissionReportData, searchQuery, selectedClassFilter, startDate, endDate]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (reportType === 'class-centric') {
      return {
        label1: 'Classes', val1: filteredData.length,
        label2: 'Total Students', val2: filteredData.reduce((s, i) => s + i.studentsCount, 0),
        label3: 'Shared Files', val3: filteredData.reduce((s, i) => s + i.filesCount, 0),
        color1: 'pink', color2: 'green', color3: 'blue'
      };
    } else if (reportType === 'file-centric') {
      const codes = [...new Set(filteredData.map(i => i.classCode))];
      return {
        label1: 'Classes', val1: codes.length,
        label2: 'Total Students', val2: codes.reduce((s, code) => {
          const cls = classes.find(c => c.classCode === code);
          return s + (cls?.students?.length || 0);
        }, 0),
        label3: 'Shared Files', val3: filteredData.length,
        color1: 'pink', color2: 'green', color3: 'blue'
      };
    } else {
      const submitted = filteredData.filter(r => r._hasSubmission).length;
      const graded = filteredData.filter(r => r._isGraded).length;
      return {
        label1: 'Total Rows', val1: filteredData.length,
        label2: 'Submitted', val2: submitted,
        label3: 'Graded', val3: graded,
        color1: 'pink', color2: 'green', color3: 'yellow'
      };
    }
  }, [filteredData, reportType, classes]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedClassFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const switchReportType = (type) => {
    setReportType(type);
    setCurrentPage(1);
    resetFilters();
  };

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExportClick = (format) => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    let headers, data, filename;

    if (reportType === 'class-centric') {
      headers = [
        { key: 'classCode', label: 'Class Code' },
        { key: 'className', label: 'Class Name' },
        { key: 'school', label: 'School' },
        { key: 'course', label: 'Course' },
        { key: 'year', label: 'Year' },
        { key: 'block', label: 'Block' },
        { key: 'description', label: 'Batch/Description' },
        { key: 'studentsCount', label: 'Students Enrolled' },
        { key: 'filesCount', label: 'Shared Files' },
        { key: 'filesList', label: 'File Names' },
        { key: 'status', label: 'Status' }
      ];
      data = filteredData.map(item => ({
        classCode: item.classCode,
        className: item.className,
        school: item.school,
        course: item.course,
        year: item.year,
        block: item.block,
        description: item.description || 'N/A',
        studentsCount: item.studentsCount,
        filesCount: item.filesCount,
        filesList: item.filesArray?.length > 0 ? item.filesArray.join('\n') : 'No files uploaded',
        status: item.isActive ? 'Active' : 'Inactive'
      }));
      filename = 'my_classes_report';

    } else if (reportType === 'file-centric') {
      headers = [
        { key: 'fileName', label: 'File Name' },
        { key: 'fileSizeFormatted', label: 'File Size' },
        { key: 'fileType', label: 'File Type' },
        { key: 'uploadedDate', label: 'Upload Date' },
        { key: 'classCode', label: 'Class Code' },
        { key: 'className', label: 'Class Name' },
        { key: 'school', label: 'School' },
        { key: 'studentsCount', label: 'Enrolled Students' }
      ];
      data = filteredData.map(item => ({
        fileName: item.fileName,
        fileSizeFormatted: formatFileSize(item.fileSize),
        fileType: item.fileType,
        uploadedDate: item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'N/A',
        classCode: item.classCode,
        className: item.className,
        school: item.school,
        studentsCount: item.studentsCount
      }));
      filename = 'my_uploads_report';

    } else {
      // submission-report — all 14 columns
      headers = [
        { key: 'classCode', label: 'Class Code' },
        { key: 'className', label: 'Class Name' },
        { key: 'folderName', label: 'Folder Name' },
        { key: 'assignmentTitle', label: 'Assignment Title' },
        { key: 'teacherFileName', label: 'Teacher File Name' },
        { key: 'teacherUploadDate', label: 'Teacher Upload Date' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'studentEmail', label: 'Student Email' },
        { key: 'submissionStatus', label: 'Submission Status' },
        { key: 'submittedFileName', label: 'Submitted File Name' },
        { key: 'submissionDate', label: 'Submission Date' },
        { key: 'submittedFileSize', label: 'File Size' },
        { key: 'gradeScore', label: 'Grade Score' },
        { key: 'educatorFeedback', label: 'Educator Feedback' }
      ];
      data = filteredData.map(item => ({
        classCode: item.classCode,
        className: item.className,
        folderName: item.folderName,
        assignmentTitle: item.assignmentTitle,
        teacherFileName: item.teacherFileName,
        teacherUploadDate: item.teacherUploadDate,
        studentName: item.studentName,
        studentEmail: item.studentEmail,
        submissionStatus: item.submissionStatus,
        submittedFileName: item.submittedFileName,
        submissionDate: item.submissionDate,
        submittedFileSize: item.submittedFileSize,
        gradeScore: String(item.gradeScore),
        educatorFeedback: item.educatorFeedback
      }));

      const classLabel = selectedClassFilter ? `_${selectedClassFilter}` : '';
      filename = `submission_report${classLabel}`;
    }

    handleExport(format, data, headers, filename);
  };

  // ── Stat color map ────────────────────────────────────────────────────────
  const statColorMap = {
    pink: { text: 'text-pink-400', icon: 'text-pink-500/20' },
    green: { text: 'text-green-400', icon: 'text-green-500/20' },
    blue: { text: 'text-blue-400', icon: 'text-blue-500/20' },
    yellow: { text: 'text-yellow-400', icon: 'text-yellow-500/20' }
  };

  // ── Loading / Error guards ────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-white">

      {/* ── Title + Report Type Tabs ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Report Generation</h2>
          <p className="text-gray-400 text-sm">Visualize and export enrollment, uploads, and submission grade reports</p>
        </div>

        <div className="flex bg-gray-800 p-1 border border-gray-700 rounded-lg flex-wrap gap-1">
          {[
            { key: 'class-centric', label: 'Class-Centric Summary' },
            { key: 'file-centric', label: 'File-Centric Uploads' },
            { key: 'submission-report', label: ' Submission Report' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => switchReportType(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${reportType === tab.key
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/10'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: stats.label1, val: stats.val1, color: stats.color1, Icon: FiBook },
          { label: stats.label2, val: stats.val2, color: stats.color2, Icon: FiUsers },
          { label: stats.label3, val: stats.val3, color: stats.color3, Icon: reportType === 'submission-report' ? FiAward : FiActivity }
        ].map(({ label, val, color, Icon }) => (
          <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">{label}</p>
              <p className={`text-3xl font-bold mt-2 ${statColorMap[color].text}`}>{val}</p>
            </div>
            <Icon className={`w-10 h-10 ${statColorMap[color].icon}`} />
          </div>
        ))}
      </div>

      {/* ── Filter Controls ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <FiFilter className="text-pink-400" />
            <h4 className="font-semibold text-white">Filter Controls</h4>
          </div>
          <button onClick={resetFilters} className="text-sm text-pink-400 hover:text-pink-300 font-medium transition">
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Search Keywords</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={
                  reportType === 'class-centric' ? 'Code, name, school...' :
                    reportType === 'file-centric' ? 'Filename, code, type...' :
                      'Student, assignment, folder...'
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Filter by Class Code</label>
            <select
              value={selectedClassFilter}
              onChange={(e) => { setSelectedClassFilter(e.target.value); setCurrentPage(1); }}
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

          <div>
            <label className="text-xs text-gray-400 block mb-1">Date Target Info</label>
            <div className="text-xs text-gray-500 py-2">
              {reportType === 'submission-report'
                ? 'Filter by class above, then export'
                : 'Use date filters below to narrow results'}
            </div>
          </div>
        </div>

        {/* Date filters — hidden for submission report (date is on submission row) */}
        {reportType !== 'submission-report' && (
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
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
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
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Preview Section ── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <FiClock className="text-pink-400" />
            <h3 className="font-semibold text-white">
              Report Preview{' '}
              {!loadingSubmissions && <span className="text-gray-400 font-normal text-sm">({filteredData.length} records)</span>}
            </h3>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition duration-200 text-sm font-semibold shadow-md shadow-pink-600/10 self-end sm:self-auto disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={filteredData.length === 0 || loadingSubmissions}
          >
            <FiDownload className="w-4 h-4" /> Export Report
          </button>
        </div>

        {/* ── Submission Report Loading State ── */}
        {reportType === 'submission-report' && loadingSubmissions && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-pink-500 mb-4"></div>
            <p className="font-medium">Loading submission data...</p>
            <p className="text-xs mt-1 text-gray-500">Fetching students, folders & submissions across all classes</p>
          </div>
        )}

        {/* ── Submission Report Error State ── */}
        {reportType === 'submission-report' && submissionLoadError && !loadingSubmissions && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 font-medium">{submissionLoadError}</p>
            <button
              onClick={() => { setSubmissionReportLoaded(false); fetchSubmissionReport(); }}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Data Table ── */}
        {!loadingSubmissions && !submissionLoadError && (
          <>
            {filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400">
                    {reportType === 'class-centric' && (
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
                    )}
                    {reportType === 'file-centric' && (
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
                    {reportType === 'submission-report' && (
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">Class</th>
                        <th className="px-4 py-3 whitespace-nowrap">📁 Folder</th>
                        <th className="px-4 py-3 whitespace-nowrap">Assignment</th>
                        <th className="px-4 py-3 whitespace-nowrap">Teacher File</th>
                        <th className="px-4 py-3 whitespace-nowrap">Uploaded</th>
                        <th className="px-4 py-3 whitespace-nowrap">Student</th>
                        <th className="px-4 py-3 whitespace-nowrap">Email</th>
                        <th className="px-4 py-3 whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 whitespace-nowrap">Submitted File</th>
                        <th className="px-4 py-3 whitespace-nowrap">Date Submitted</th>
                        <th className="px-4 py-3 whitespace-nowrap text-center">Grade</th>
                        <th className="px-4 py-3 whitespace-nowrap">Feedback</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {reportType === 'class-centric' && paginatedData.map((item) => (
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
                        <td className="px-4 py-4 text-xs text-gray-400">
                          <div className="space-y-1">
                            {item.filesArray?.length > 0 ? (
                              item.filesArray.map((fn, idx) => (
                                <div key={idx} className="truncate max-w-xs" title={fn}>• {fn}</div>
                              ))
                            ) : (
                              <span className="text-gray-600 italic">No files shared</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs ${item.isActive ? 'bg-green-500/25 text-green-400' : 'bg-red-500/25 text-red-400'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {reportType === 'file-centric' && paginatedData.map((item) => (
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
                    ))}

                    {reportType === 'submission-report' && paginatedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-700/40 transition duration-150">
                        {/* Class */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-pink-300 text-xs">{item.classCode}</div>
                          <div className="text-gray-400 text-xs mt-0.5 max-w-[100px] truncate" title={item.className}>{item.className}</div>
                        </td>
                        {/* Folder */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 text-yellow-300 text-xs font-medium">
                            📁 <span className="max-w-[100px] truncate" title={item.folderName}>{item.folderName}</span>
                          </span>
                        </td>
                        {/* Assignment */}
                        <td className="px-4 py-3 max-w-[140px]">
                          <p className="text-white text-sm font-medium truncate" title={item.assignmentTitle}>{item.assignmentTitle}</p>
                          <p className="text-gray-500 text-xs truncate" title={item.teacherFileName}>{item.teacherFileName}</p>
                        </td>
                        {/* Teacher File */}
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden xl:table-cell" title={item.teacherFileName}>
                          <span className="max-w-[120px] truncate block">{item.teacherFileName}</span>
                        </td>
                        {/* Uploaded */}
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{item.teacherUploadDate}</td>
                        {/* Student */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-white text-sm font-medium">{item.studentName}</span>
                        </td>
                        {/* Email */}
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{item.studentEmail}</td>
                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item._hasSubmission ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/30 text-green-300 border border-green-800/40">
                              <FiCheckCircle className="w-3 h-3" /> Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/30 text-red-300 border border-red-800/40">
                              <FiXCircle className="w-3 h-3" /> No Submission
                            </span>
                          )}
                        </td>
                        {/* Submitted File */}
                        <td className="px-4 py-3 text-xs text-gray-300 whitespace-nowrap max-w-[130px]">
                          <span className="truncate block" title={item.submittedFileName}>{item.submittedFileName}</span>
                          {item._hasSubmission && (
                            <span className="text-gray-500">{item.submittedFileSize}</span>
                          )}
                        </td>
                        {/* Submission Date */}
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{item.submissionDate}</td>
                        {/* Grade */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {item._isGraded ? (
                            <span className="text-green-400 font-bold text-sm">{item._score}<span className="text-gray-500 text-xs">/100</span></span>
                          ) : item._hasSubmission ? (
                            <span className="text-yellow-400 text-xs italic">Ungraded</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        {/* Feedback */}
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px]">
                          <span className="block truncate italic" title={item.educatorFeedback}>{item.educatorFeedback}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FiAlertCircle className="w-12 h-12 mb-3 text-gray-600" />
                <p className="font-semibold text-white">No data matches current filters</p>
                <p className="text-sm">
                  {reportType === 'submission-report' && submissionReportData.length === 0 && !loadingSubmissions
                    ? 'No students or assignments found across your classes.'
                    : 'Try resetting filters or changing your queries.'}
                </p>
              </div>
            )}

            {/* ── Pagination ── */}
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
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const page = totalPages <= 7 ? i + 1 : (
                      currentPage <= 4 ? i + 1 :
                        currentPage >= totalPages - 3 ? totalPages - 6 + i :
                          currentPage - 3 + i
                    );
                    return (
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
                    );
                  })}
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

                <span className="text-gray-400 text-sm ml-4">Page {currentPage} of {totalPages}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Export Modal ── */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportClick}
        title={
          reportType === 'class-centric' ? 'Export Class Enrollment Summary' :
            reportType === 'file-centric' ? 'Export File Uploads Report' :
              'Export Submission Report'
        }
      />
    </div>
  );
}