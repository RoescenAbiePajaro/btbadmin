import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { saveAs } from 'file-saver';

// Helper function to format data for export
const formatDataForExport = (data, headers) => {
  if (!data || data.length === 0) return [];
  
  return data.map(row => {
    const formattedRow = {};
    headers.forEach(header => {
      const value = row[header.key] || row[header] || '';
      formattedRow[header.label || header] = value;
    });
    return formattedRow;
  });
};

// Export to Excel
export const exportToExcel = (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    // Prepare data
    const headerRow = headers.map(h => h.label || h);
    const dataRows = data.map(row => 
      headers.map(h => {
        const key = h.key || h;
        const value = row[key];
        return value !== null && value !== undefined ? String(value) : '';
      })
    );

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    
    // Set column widths
    const colWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(blob, `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Excel export error:', error);
    alert('Error exporting to Excel: ' + error.message);
  }
};

// Export to PDF
export const exportToPDF = (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const doc = new jsPDF();
    
    // Prepare table data
    const tableHeaders = headers.map(h => h.label || h);
    const tableRows = data.map(row => 
      headers.map(h => {
        const key = h.key || h;
        const value = row[key];
        return value !== null && value !== undefined ? String(value) : '';
      })
    );

    // Add title
    doc.setFontSize(16);
    doc.text(filename || 'Data Export', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    // Add table using autoTable
    autoTable(doc, {
      head: [tableHeaders],
      body: tableRows,
      startY: 28,
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [138, 43, 226], // Violet color
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 28 }
    });

    // Save PDF
    doc.save(`${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Error exporting to PDF: ' + error.message);
  }
};

// Export to PPTX (using backend API)
export const exportToPPTX = async (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to export data');
      return;
    }

    // For PPTX, we'll send data to backend API
    const response = await fetch('https://btbtestservice.onrender.com/api/dashboard/export/pptx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data,
        headers: headers.map(h => ({ label: h.label || h, key: h.key || h })),
        filename: filename || 'export'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to export PPTX');
    }

    const blob = await response.blob();
    saveAs(blob, `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.pptx`);
  } catch (error) {
    console.error('PPTX export error:', error);
    alert('PPTX export is currently unavailable. Please use Excel or PDF format.');
  }
};

// Export to DOCX (using backend API)
export const exportToDOCX = async (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to export data');
      return;
    }

    // For DOCX, we'll send data to backend API
    const response = await fetch('https://btbtestservice.onrender.com/api/dashboard/export/docx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data,
        headers: headers.map(h => ({ label: h.label || h, key: h.key || h })),
        filename: filename || 'export'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to export DOCX');
    }

    const blob = await response.blob();
    saveAs(blob, `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.docx`);
  } catch (error) {
    console.error('DOCX export error:', error);
    alert('DOCX export is currently unavailable. Please use Excel or PDF format.');
  }
};

// Helper function to create HTML table
const createTableHTML = (data, headers) => {
  let html = '<table><thead><tr>';
  headers.forEach(h => {
    html += `<th>${h.label || h}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    html += '<tr>';
    headers.forEach(h => {
      const key = h.key || h;
      html += `<td>${row[key] || ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
};

// Export to PNG
export const exportToPNG = (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1200;
    canvas.height = Math.max(600, data.length * 30 + 100);
    
    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(filename || 'Data Export', 20, 30);
    
    // Draw headers
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#8a2be2';
    const colWidth = canvas.width / headers.length;
    headers.forEach((h, i) => {
      ctx.fillText((h.label || h).substring(0, 15), 20 + i * colWidth, 70);
    });
    
    // Draw rows
    ctx.font = '11px Arial';
    ctx.fillStyle = '#000000';
    data.forEach((row, rowIndex) => {
      headers.forEach((h, colIndex) => {
        const key = h.key || h;
        const value = String(row[key] || '').substring(0, 20);
        ctx.fillText(value, 20 + colIndex * colWidth, 100 + rowIndex * 25);
      });
    });
    
    canvas.toBlob((blob) => {
      saveAs(blob, `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.png`);
    }, 'image/png');
  } catch (error) {
    console.error('PNG export error:', error);
    alert('Error exporting to PNG: ' + error.message);
  }
};

// Export to JPG
export const exportToJPG = (data, headers, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1200;
    canvas.height = Math.max(600, data.length * 30 + 100);
    
    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(filename || 'Data Export', 20, 30);
    
    // Draw headers
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#8a2be2';
    const colWidth = canvas.width / headers.length;
    headers.forEach((h, i) => {
      ctx.fillText((h.label || h).substring(0, 15), 20 + i * colWidth, 70);
    });
    
    // Draw rows
    ctx.font = '11px Arial';
    ctx.fillStyle = '#000000';
    data.forEach((row, rowIndex) => {
      headers.forEach((h, colIndex) => {
        const key = h.key || h;
        const value = String(row[key] || '').substring(0, 20);
        ctx.fillText(value, 20 + colIndex * colWidth, 100 + rowIndex * 25);
      });
    });
    
    canvas.toBlob((blob) => {
      saveAs(blob, `${filename || 'export'}_${new Date().toISOString().slice(0, 10)}.jpg`);
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('JPG export error:', error);
    alert('Error exporting to JPG: ' + error.message);
  }
};

// Main export function
export const handleExport = (format, data, headers, filename) => {
  switch (format) {
    case 'excel':
      exportToExcel(data, headers, filename);
      break;
    case 'pdf':
      exportToPDF(data, headers, filename);
      break;
    case 'png':
      exportToPNG(data, headers, filename);
      break;
    case 'jpg':
      exportToJPG(data, headers, filename);
      break;
    case 'docx':
      exportToDOCX(data, headers, filename);
      break;
    default:
      console.warn('Unknown export format:', format);
  }
};
