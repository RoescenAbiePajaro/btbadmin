// src/components/educator/SavedImagesEducator.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SavedImagesEducator = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  // Get user data from localStorage
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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      console.log('Fetching images for user:', user?.email);
      console.log('Using API URL:', process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com');

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://btbtestservice.onrender.com'}/api/saved-images/educator`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            user_email: user?.email // Optional: pass user email as query param
          }
        }
      );

      console.log('API Response:', response.data);

      if (response.data.success) {
        // Filter to only show images saved by this user
        const userImages = response.data.images.filter(img => 
          img.user_email === user?.email?.toLowerCase()
        );
        
        if (userImages.length === 0) {
          // If no images for this user, check if we should show all images
          // (for educators who might want to see all saved images)
          const allImages = response.data.images;
          setImages(allImages);
          
          if (allImages.length === 0) {
            setError('No images found in the database.');
          } else {
            console.log('Showing all images from database:', allImages.length);
          }
        } else {
          setImages(userImages);
          console.log('Showing user images:', userImages.length);
        }
      } else {
        setError(response.data.message || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Error fetching educator images:', err);
      
      // More detailed error handling
      if (err.response) {
        // Server responded with error status
        console.error('Response error:', err.response.status, err.response.data);
        
        if (err.response.status === 401) {
          setError('Session expired. Please login again.');
        } else if (err.response.status === 403) {
          setError('Access denied. You do not have permission to view these images.');
        } else if (err.response.status === 404) {
          setError('API endpoint not found. Please check the server configuration.');
        } else {
          setError(`Server error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`);
        }
      } else if (err.request) {
        // Request made but no response
        console.error('No response received:', err.request);
        setError('Network error. Please check your connection and try again.');
      } else {
        // Other errors
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
      
      // Remove image from state
      setImages(images.filter(img => img.id !== imageId));
      alert('Image deleted successfully');
    } catch (err) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-4 text-white">Loading images...</span>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Saved Images</h3>
          <p className="text-gray-400 text-sm">
            {images.length} image{images.length !== 1 ? 's' : ''} found
            {user?.email && ` for ${user.email}`}
          </p>
        </div>
        <button
          onClick={fetchSavedImages}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 rounded-lg">
          <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h4 className="mt-4 text-lg font-medium text-gray-400">No saved images found</h4>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Images saved from VirtualPainter will appear here. 
            {user?.role === 'educator' ? ' You can view all saved images.' : ' Only your saved images will appear.'}
          </p>
          <div className="mt-6">
            <p className="text-gray-500 text-sm mb-2">To save images:</p>
            <ol className="text-gray-400 text-sm list-decimal list-inside space-y-1 max-w-md mx-auto">
              <li>Open VirtualPainter application</li>
              <li>Draw or create your artwork</li>
              <li>Click the Save button in the toolbar</li>
              <li>Images will be automatically saved to your account</li>
            </ol>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <div key={image.id} className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                <div className="relative pb-[75%] bg-gray-800">
                  {image.image_url ? (
                    <img
                      src={image.image_url}
                      alt={image.file_name}
                      className="absolute inset-0 w-full h-full object-contain bg-gray-800"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-image.png';
                        e.target.className = 'absolute inset-0 w-full h-full object-cover';
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
                    <span className="text-xs text-white px-2 py-1">
                      {image.image_type === 'transparent' ? 'Transparent' : 'Template'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-300 truncate" title={image.file_name}>
                    {image.file_name}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {image.created_at ? new Date(image.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <a
                        href={image.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="text-red-400 hover:text-red-300 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {image.user_email && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">{image.user_email}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>{(image.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              <strong>Note:</strong> These images are stored in Supabase Storage and linked to your account. 
              They are automatically saved when you use the Save function in VirtualPainter.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SavedImagesEducator;