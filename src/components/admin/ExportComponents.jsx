import React from 'react';
import { FiDownload } from 'react-icons/fi';

// Export Classes Summary Component
export const ExportClassesSummary = ({ filteredData, getSchoolName }) => {
  const exportClassesSummaryCSV = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return;
    
    const headers = ['Educator', 'Email', 'Total Classes', 'Active Classes', 'Total Students', 'School'];
    
    const summary = Object.entries(
      filteredData.data.reduce((acc, cls) => {
        const educatorId = cls.educator?._id || 'unknown';
        if (!acc[educatorId]) {
          acc[educatorId] = {
            name: cls.educator?.fullName || 'N/A',
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

    const rows = summary.map(([_, data]) => {
      const schoolId = data.classes[0]?.school;
      const values = [
        data.name,
        data.email,
        data.totalClasses,
        data.activeClasses,
        data.totalStudents,
        schoolId ? getSchoolName(schoolId) : 'Not specified'
      ];
      
      return values.map(v => {
        const s = String(v).replace(/"/g, '""');
        if (s.search(/([",\n])/g) >= 0) return '"' + s + '"';
        return s;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, 'classes_summary');
  };

  return (
    <button 
      onClick={exportClassesSummaryCSV}
      className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
    >
      <FiDownload className="w-5 h-5" /> Export Summary
    </button>
  );
};

// Export Class Details Component
export const ExportClassDetails = ({ filteredData, getSchoolName }) => {
  const exportClassDetailsCSV = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return;
    
    const headers = ['Class Code', 'Class Name', 'Educator', 'Students', 'Course', 'Year', 'Block', 'Batch', 'Status', 'School'];
    
    const rows = filteredData.data.map(cls => {
      const values = [
        cls.classCode || 'N/A',
        cls.className || 'N/A',
        cls.educator?.fullName || 'N/A',
        cls.students?.length || 0,
        cls.course || 'N/A',
        cls.year || 'N/A',
        cls.block || 'N/A',
        cls.description || 'N/A',
        cls.isActive ? 'Active' : 'Inactive',
        cls.school ? getSchoolName(cls.school) : 'Not specified'
      ];
      
      return values.map(v => {
        const s = String(v).replace(/"/g, '""');
        if (s.search(/([",\n])/g) >= 0) return '"' + s + '"';
        return s;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, 'class_details');
  };

  return (
    <button 
      onClick={exportClassDetailsCSV}
      className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
    >
      <FiDownload className="w-5 h-5" /> Export Details
    </button>
  );
};

// Export Users Component
export const ExportUsers = ({ filteredData, filters, deriveUserSchool }) => {
  const exportUsersToCSV = () => {
    if (!filteredData || !filteredData.data || filteredData.data.length === 0) return;
    
    const headers = ['Name', 'Email', 'Role', 'School', 'Status', 'Joined'];
    const sourceUsers = filters.role ? filteredData.data.filter(u => u.role === filters.role) : filteredData.data;
    
    const rows = sourceUsers.map(user => {
      const values = [
        user.fullName || 'N/A',
        user.email || 'N/A',
        user.role || 'N/A',
        deriveUserSchool(user),
        user.isActive ? 'Active' : 'Inactive',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'
      ];
      
      return values.map(v => {
        const s = String(v).replace(/"/g, '""');
        if (s.search(/([",\n])/g) >= 0) return '"' + s + '"';
        return s;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, 'users_export');
  };

  return (
    <button 
      onClick={exportUsersToCSV}
      className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
    >
      <FiDownload className="w-5 h-5" /> Export
    </button>
  );
};

// Export Feedback Component
export const ExportFeedback = ({ feedbackData }) => {
  const exportFeedbackCSV = () => {
    if (!feedbackData || feedbackData.length === 0) return;
    
    const headers = ['User', 'Email', 'Role', 'Rating', 'Category', 'Message', 'Status', 'Date', 'School'];
    
    const rows = feedbackData.map(item => {
      const values = [
        item.userName || 'N/A',
        item.userEmail || 'N/A',
        item.userRole || 'N/A',
        item.rating ?? 'N/A',
        item.category || 'N/A',
        item.message || 'N/A',
        item.status || 'N/A',
        item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
        item.school || 'N/A'
      ];
      
      return values.map(v => {
        const s = String(v).replace(/"/g, '""');
        if (s.search(/([",\n])/g) >= 0) return '"' + s + '"';
        return s;
      }).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, 'feedback');
  };

  return (
    <button 
      onClick={exportFeedbackCSV}
      className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
    >
      <FiDownload className="w-5 h-5" /> Export
    </button>
  );
};

// Export Learning Materials Component
export const ExportLearningMaterials = ({ educatorSharedFiles, getSchoolName, classCodes }) => {
  const exportLearningMaterialsCSV = () => {
    if (!educatorSharedFiles || educatorSharedFiles.length === 0) return;
    
    const headers = ['Educator Name', 'Email', 'School', 'File Name', 'Class Code', 'Class Name', 'Type', 'Size', 'Uploaded Date'];
    
    const rows = [];
    educatorSharedFiles.forEach(educator => {
      educator.files.forEach(file => {
        const classItem = classCodes.find(c => c.classCode === file.classCode);
        const values = [
          educator.educatorName || 'N/A',
          educator.educatorEmail || 'N/A',
          educator.educatorSchool ? getSchoolName(educator.educatorSchool) : 'Not specified',
          file.name || file.originalName || 'N/A',
          file.classCode || 'N/A',
          classItem?.className || 'N/A',
          file.type || 'material',
          file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A',
          file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : 'N/A'
        ];
        
        rows.push(values.map(v => {
          const s = String(v).replace(/"/g, '""');
          if (s.search(/([",\n])/g) >= 0) return '"' + s + '"';
          return s;
        }).join(','));
      });
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, 'learning_materials');
  };

  return (
    <button 
      onClick={exportLearningMaterialsCSV}
      className="bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg flex items-center gap-2"
    >
      <FiDownload className="w-5 h-5" /> Export
    </button>
  );
};

// Helper function to download CSV
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};