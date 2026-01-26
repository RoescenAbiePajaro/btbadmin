
// src/components/admin/ExportComponents.jsx
import React, { useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import ExportModal from './ExportModal.jsx';
import { handleExport } from '../../utils/exportUtils.js';

// Export Classes Summary Component
export const ExportClassesSummary = ({ filteredData, getSchoolName }) => {
  const [showModal, setShowModal] = useState(false);

  const prepareExportData = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return { data: [], headers: [] };
    
    const headers = [
      { key: 'educator', label: 'Educator' },
      { key: 'email', label: 'Email' },
      { key: 'totalClasses', label: 'Total Classes' },
      { key: 'activeClasses', label: 'Active Classes' },
      { key: 'totalStudents', label: 'Total Students' },
      { key: 'school', label: 'School' }
    ];
    
    const summary = Object.entries(
      filteredData.data.reduce((acc, cls) => {
        const educatorId = cls.educator?._id || 'unknown';
        if (!acc[educatorId]) {
          acc[educatorId] = {
            educator: cls.educator?.fullName || 'N/A',
            email: cls.educator?.email || 'N/A',
            classes: [],
            totalClasses: 0,
            activeClasses: 0,
            totalStudents: 0
          };
        }
        acc[educatorId].totalClasses += 1;
        if (cls.isActive) acc[educatorId].activeClasses += 1;
        acc[educatorId].totalStudents += cls.students?.length || 0;
        acc[educatorId].classes.push(cls);
        return acc;
      }, {})
    );

    const data = summary.map(([_, data]) => {
      const schoolId = data.classes[0]?.school;
      return {
        educator: data.educator,
        email: data.email,
        totalClasses: data.totalClasses,
        activeClasses: data.activeClasses,
        totalStudents: data.totalStudents,
        school: schoolId ? getSchoolName(schoolId) : 'Not specified'
      };
    });

    return { data, headers };
  };

  const handleExportClick = (format) => {
    const { data, headers } = prepareExportData();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    handleExport(format, data, headers, 'classes_summary');
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FiDownload className="w-5 h-5" /> Export
      </button>
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleExportClick}
        title="Export Classes Summary"
      />
    </>
  );
};

// Export Class Details Component
export const ExportClassDetails = ({ filteredData, getSchoolName }) => {
  const [showModal, setShowModal] = useState(false);

  const prepareExportData = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return { data: [], headers: [] };
    
    const headers = [
      { key: 'classCode', label: 'Class Code' },
      { key: 'className', label: 'Class Name' },
      { key: 'educator', label: 'Educator' },
      { key: 'students', label: 'Students' },
      { key: 'course', label: 'Course' },
      { key: 'year', label: 'Year' },
      { key: 'block', label: 'Block' },
      { key: 'batch', label: 'Batch' },
      { key: 'status', label: 'Status' },
      { key: 'school', label: 'School' }
    ];
    
    const data = filteredData.data.map(cls => ({
      classCode: cls.classCode || 'N/A',
      className: cls.className || 'N/A',
      educator: cls.educator?.fullName || 'N/A',
      students: cls.students?.length || 0,
      course: cls.course || 'N/A',
      year: cls.year || 'N/A',
      block: cls.block || 'N/A',
      batch: cls.description || 'N/A',
      status: cls.isActive ? 'Active' : 'Inactive',
      school: cls.school ? getSchoolName(cls.school) : 'Not specified'
    }));

    return { data, headers };
  };

  const handleExportClick = (format) => {
    const { data, headers } = prepareExportData();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    handleExport(format, data, headers, 'class_details');
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FiDownload className="w-5 h-5" /> Export
      </button>
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleExportClick}
        title="Export Class Details"
      />
    </>
  );
};

// Export Users Component
export const ExportUsers = ({ filteredData, filters, deriveUserSchool }) => {
  const [showModal, setShowModal] = useState(false);

  const prepareExportData = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return { data: [], headers: [] };
    
    const headers = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'school', label: 'School' },
      { key: 'status', label: 'Status' },
      { key: 'joined', label: 'Joined' }
    ];
    
    const sourceUsers = filters.role ? filteredData.data.filter(u => u.role === filters.role) : filteredData.data;
    
    const data = sourceUsers.map(user => ({
      name: user.fullName || 'N/A',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      school: deriveUserSchool(user),
      status: user.isActive ? 'Active' : 'Inactive',
      joined: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
    }));

    return { data, headers };
  };

  const handleExportClick = (format) => {
    const { data, headers } = prepareExportData();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    handleExport(format, data, headers, 'users_export');
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FiDownload className="w-5 h-5" /> Export
      </button>
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleExportClick}
        title="Export Users"
      />
    </>
  );
};

// Export Feedback Component
export const ExportFeedback = ({ feedbackData }) => {
  const [showModal, setShowModal] = useState(false);

  const prepareExportData = () => {
    if (!feedbackData || feedbackData.length === 0) return { data: [], headers: [] };
    
    const headers = [
      { key: 'user', label: 'User' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'rating', label: 'Rating' },
      { key: 'category', label: 'Category' },
      { key: 'message', label: 'Message' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Date' },
      { key: 'school', label: 'School' }
    ];
    
    const data = feedbackData.map(item => ({
      user: item.userName || 'N/A',
      email: item.userEmail || 'N/A',
      role: item.userRole || 'N/A',
      rating: item.rating ?? 'N/A',
      category: item.category || 'N/A',
      message: item.message || 'N/A',
      status: item.status || 'N/A',
      date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
      school: item.school || 'N/A'
    }));

    return { data, headers };
  };

  const handleExportClick = (format) => {
    const { data, headers } = prepareExportData();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    handleExport(format, data, headers, 'feedback');
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FiDownload className="w-5 h-5" /> Export
      </button>
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleExportClick}
        title="Export Feedback"
      />
    </>
  );
};

// Export Learning Materials Component
export const ExportLearningMaterials = ({ educatorSharedFiles, getSchoolName, classCodes, educatorUsers, educatorClassSummary }) => {
  const [showModal, setShowModal] = useState(false);

  const prepareExportData = () => {
    if (!educatorSharedFiles || educatorSharedFiles.length === 0) return { data: [], headers: [] };
    
    const headers = [
      { key: 'educatorName', label: 'Educator Name' },
      { key: 'email', label: 'Email' },
      { key: 'school', label: 'School' },
      { key: 'fileName', label: 'File Name' },
      { key: 'className', label: 'Class Name' },
      { key: 'classDescription', label: 'Class Description' },
      { key: 'classCode', label: 'Class Code' },
      { key: 'type', label: 'Type' },
      { key: 'size', label: 'Size' },
      { key: 'uploadedDate', label: 'Uploaded Date' }
    ];
    
    const data = [];
    educatorSharedFiles.forEach(educator => {
      educator.files.forEach(file => {
        const classItem = classCodes.find(c => c.classCode === file.classCode);
        // Get school with fallback logic
        const schoolId = educator.educatorSchool || 
                         educatorUsers[educator.educatorId]?.school || 
                         educatorClassSummary?.[educator.educatorId]?.school;
        
        data.push({
          educatorName: educator.educatorName || 'N/A',
          email: educator.educatorEmail || 'N/A',
          school: schoolId ? getSchoolName(schoolId) : 'Not specified',
          fileName: file.name || file.originalName || 'N/A',
          className: classItem?.className || file.classCode || 'N/A',
          classDescription: classItem?.description || 'N/A',
          classCode: file.classCode || 'N/A',
          type: file.type || 'material',
          size: file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A',
          uploadedDate: file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A'
        });
      });
    });

    return { data, headers };
  };

  const handleExportClick = (format) => {
    const { data, headers } = prepareExportData();
    if (data.length === 0) {
      alert('No data to export');
      return;
    }
    handleExport(format, data, headers, 'learning_materials');
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FiDownload className="w-5 h-5" /> Export
      </button>
      <ExportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onExport={handleExportClick}
        title="Export Learning Materials"
      />
    </>
  );
};