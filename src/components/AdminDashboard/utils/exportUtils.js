export const exportToCSV = async ({ selectedCategory, timeFilter, startDate, endDate, showToastMessage }) => {
  try {
    showToastMessage('Preparing CSV export...', 'info');
    
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Your session has expired. Please log in again.');
    }

    let url = 'https://btbsitess.onrender.com/api/clicks?page=1&limit=10000';
    if (selectedCategory !== 'all') {
      const categoryButtons = clickCategories[selectedCategory]?.map(item => item.button) || [];
      url += `&buttons=${categoryButtons.join(',')}`;
    }
    
    if (timeFilter === 'custom' && startDate && endDate) {
      url += `&startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to fetch data for export');
    }

    const data = await res.json();
    let allClicksData = data.clicks || [];

    if (allClicksData.length === 0) {
      showToastMessage('No data to export', 'info');
      return;
    }

    const headers = [
      'Button',
      'Page',
      'Device Type',
      'Operating System',
      'Browser',
      'IP Address',
      'Timestamp',
      'Date & Time',
      'User Agent',
      'ID'
    ];

    const csvContent = [
      headers.join(','),
      ...allClicksData.map(click => [
        `"${(click.button || '').replace(/"/g, '""')}"`,
        `"${(click.page || '').replace(/"/g, '""')}"`,
        `"${(click.deviceType || 'Unknown').replace(/"/g, '""')}"`,
        `"${(click.operatingSystem || 'Unknown').replace(/"/g, '""')}"`,
        `"${(click.browser || 'Unknown').replace(/"/g, '""')}"`,
        `"${(click.ipAddress || 'Not available').replace(/"/g, '""')}"`,
        `"${new Date(click.timestamp).toISOString()}"`,
        `"${new Date(click.timestamp).toLocaleString()}"`,
        `"${(click.userAgent || 'Not available').replace(/"/g, '""')}"`,
        `"${click._id || ''}"`
      ].join(','))
    ].join('\n');

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const filename = `guest_activity_data_${timestamp}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlBlob;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(urlBlob);
    }
    
    showToastMessage(`CSV exported successfully with ${allClicksData.length} records`, 'success');
  } catch (error) {
    throw new Error(error.message || 'Failed to export CSV');
  }
};