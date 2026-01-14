// src/components/student/SavedImagesStudent.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SavedImagesStudent = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'template', 'transparent'

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  const fetchSavedImages = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/student`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setImages(response.data.images);
      } else {
        setError(response.data.message || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Error fetching student images:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view these images.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavedImages();
    }
  }, [user]);

  const downloadImage = async (image) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/proxy/${image.id || image._id}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`
          },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', image.file_name || 'image.png');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image:', err);
      alert('Failed to download image');
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/${imageId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setImages(images.filter(img => img.id !== imageId && img._id !== imageId));
      alert('Image deleted successfully');
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    }
  };

  const syncImages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        alert(response.data.message);
        fetchSavedImages(); // Refresh the list
      }
    } catch (err) {
      console.error('Error syncing images:', err);
      alert('Failed to sync images');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter images based on selected filter
  const filteredImages = images.filter(image => {
    if (filter === 'all') return true;
    if (filter === 'template') return image.image_type === 'template';
    if (filter === 'transparent') return image.image_type === 'transparent';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="mt-4 text-gray-400">Loading your saved images...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-300 font-semibold">Error Loading Images</p>
        </div>
        <p className="text-red-300 mt-2">{error}</p>
        <button
          onClick={fetchSavedImages}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">My Saved Images</h3>
          <p className="text-gray-400 text-sm mt-1">
            {filteredImages.length} of {images.length} image{images.length !== 1 ? 's' : ''}
            {user?.email && ` • ${user.email}`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Filter buttons */}
          <div className="flex rounded-lg overflow-hidden border border-gray-600">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('template')}
              className={`px-4 py-2 text-sm ${filter === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Template
            </button>
            <button
              onClick={() => setFilter('transparent')}
              className={`px-4 py-2 text-sm ${filter === 'transparent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Transparent
            </button>
          </div>
          
          {/* Sync button for local images */}
          <button
            onClick={syncImages}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm"
            title="Sync local images to cloud"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Cloud
          </button>
          
          <button
            onClick={fetchSavedImages}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {filteredImages.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 rounded-lg">
          <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h4 className="mt-4 text-lg font-medium text-gray-400">
            {images.length === 0 ? 'No saved images yet' : `No ${filter} images found`}
          </h4>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {images.length === 0 
              ? 'Open VirtualPainter from the dashboard and save images from there'
              : `Try changing the filter or saving some ${filter} images first`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredImages.map((image) => (
            <div key={image.id || image._id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <div className="relative pb-[75%] bg-gray-800 overflow-hidden">
                <img
                  src={image.thumbnailUrl || `${process.env.REACT_APP_API_URL || ''}/api/saved-images/thumbnail/${image.id || image._id}`}
                  alt={image.file_name}
                  className="absolute inset-0 w-full h-full object-contain bg-gray-800 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://via.placeholder.com/300x200/1f2937/9ca3af?text=${encodeURIComponent(image.file_name || 'Image')}`;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => downloadImage(image)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1 flex-1 justify-center mr-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => setSelectedImage(image)}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${image.image_type === 'transparent' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'}`}>
                    {image.image_type === 'transparent' ? '🎨 Transparent' : '📄 Template'}
                  </span>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-900/70 text-gray-300">
                    {image.supabase_record_id ? '☁️ Cloud' : '💾 Local'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-300 truncate mb-2" title={image.file_name}>
                  {image.file_name}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatDate(image.created_at)}</span>
                  </div>
                  <span>{formatFileSize(image.file_size)}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedImage(image)}
                      className="text-blue-400 hover:text-blue-300 hover:underline text-xs flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => downloadImage(image)}
                      className="text-green-400 hover:text-green-300 hover:underline text-xs flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteImage(image.id || image._id)}
                    className="text-red-400 hover:text-red-300 hover:underline text-xs flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Bar */}
      {images.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Template: {images.filter(img => img.image_type === 'template').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Transparent: {images.filter(img => img.image_type === 'transparent').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Local: {images.filter(img => !img.supabase_record_id).length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Cloud: {images.filter(img => img.supabase_record_id).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 text-white rounded-full p-2 hover:bg-black transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="h-[70vh] flex items-center justify-center bg-gray-800 p-4">
              <img
                src={selectedImage.proxyUrl || `${process.env.REACT_APP_API_URL || ''}/api/saved-images/proxy/${selectedImage.id || selectedImage._id}`}
                alt={selectedImage.file_name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://via.placeholder.com/800x600/1f2937/9ca3af?text=${encodeURIComponent(selectedImage.file_name || 'Image not available')}`;
                }}
              />
            </div>
            
            <div className="p-6 border-t border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 mr-4">
                  <h4 className="text-lg font-semibold text-white mb-2 truncate" title={selectedImage.file_name}>
                    {selectedImage.file_name}
                  </h4>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Type: <span className={`ml-1 ${selectedImage.image_type === 'transparent' ? 'text-green-400' : 'text-blue-400'}`}>{selectedImage.image_type}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Size: {formatFileSize(selectedImage.file_size)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Saved: {formatDate(selectedImage.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadImage(selectedImage)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-600 mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                  {selectedImage.supabase_record_id ? (
                    <>
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-400">Stored securely in cloud (Supabase)</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-400">Stored locally (MongoDB) - Sync to cloud for backup</span>
                      <button
                        onClick={syncImages}
                        className="ml-4 text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded"
                      >
                        Sync to Cloud
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedImagesStudent;