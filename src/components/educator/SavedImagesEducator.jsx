// src/components/educator/SavedImagedEducator.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SavedImagesEducator = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAllImages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the new combined endpoint
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/all`,
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
        setError('Failed to fetch images');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllImages();
    
    // Optional: Set up polling for new images
    const interval = setInterval(fetchAllImages, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to get display URL
  const getImageUrl = (image) => {
    // Priority: 1. image_url, 2. supabase_url, 3. proxy_url
    return image.image_url || image.supabase_url || image.proxy_url || 
      `${process.env.REACT_APP_API_URL || ''}/api/saved-images/proxy/${image.id || image._id}`;
  };

  // Helper function to get thumbnail URL
  const getThumbnailUrl = (image) => {
    // If it's a Supabase image, we can use a smaller version
    if (image.image_url && image.image_url.includes('supabase')) {
      return `${image.image_url}?width=300&height=200&resize=cover`;
    }
    return `${process.env.REACT_APP_API_URL || ''}/api/saved-images/thumbnail/${image.id || image._id}`;
  };

  // Download function
  const downloadImage = async (image) => {
    try {
      const url = getImageUrl(image);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = image.file_name || 'image.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to proxy download
      const token = localStorage.getItem('token');
      const proxyResponse = await axios.get(
        `/api/saved-images/proxy/${image.id || image._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([proxyResponse.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = image.file_name || 'image.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    }
  };

  // Render images
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-white">Saved Images</h3>
        <div className="text-sm text-gray-400">
          {images.filter(img => img.source === 'supabase').length} Cloud • 
          {images.filter(img => img.source === 'mongodb').length} Local
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading images...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
          <button 
            onClick={fetchAllImages}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-4 text-gray-400">No saved images found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image) => (
            <div key={image.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
              <div className="relative h-48 bg-gray-800">
                <img
                  src={getThumbnailUrl(image)}
                  alt={image.file_name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://via.placeholder.com/300x200/1f2937/9ca3af?text=${encodeURIComponent(image.file_name || 'Image')}`;
                  }}
                />
                <div className="absolute top-2 right-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    image.source === 'supabase' 
                      ? 'bg-green-900/50 text-green-300' 
                      : 'bg-blue-900/50 text-blue-300'
                  }`}>
                    {image.source === 'supabase' ? '☁️ Cloud' : '💾 Local'}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <h4 className="text-white font-medium truncate" title={image.file_name}>
                  {image.file_name}
                </h4>
                <div className="mt-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>{image.image_type || 'image'}</span>
                    <span>{new Date(image.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => downloadImage(image)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {/* View larger */}}
                    className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded text-sm"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedImagesEducator;