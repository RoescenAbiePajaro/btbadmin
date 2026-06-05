// src/components/ProfilePicture.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Camera, X, Upload } from 'lucide-react';

const API_URL = 'https://btbtestservice.onrender.com';

const ProfilePicture = ({ user, onUpdate, size = 'md' }) => {
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setShowModal(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', selectedFile);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/profile/upload-profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.toast?.type === 'success') {
        // Update local user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.profilePicture = response.data.data.profilePicture;
        localStorage.setItem('user', JSON.stringify(userData));
        
        if (onUpdate) onUpdate(response.data.data.profilePicture);
        
        setShowModal(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        alert(response.data.toast?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.toast?.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/api/profile/remove-profile-picture`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.toast?.type === 'success') {
        // Update local user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.profilePicture = { url: '', publicId: '', updatedAt: null };
        localStorage.setItem('user', JSON.stringify(userData));
        
        if (onUpdate) onUpdate(null);
      } else {
        alert(response.data.toast?.message || 'Remove failed');
      }
    } catch (error) {
      console.error('Remove error:', error);
      alert(error.response?.data?.toast?.message || 'Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="relative group cursor-pointer">
        {/* Profile Picture Display */}
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-gray-700 hover:ring-blue-500 transition-all duration-200`}
          onClick={() => fileInputRef.current?.click()}
        >
          {user?.profilePicture?.url ? (
            <img
              src={user.profilePicture.url}
              alt={user.fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-xl">
              {getInitials(user?.fullName)}
            </span>
          )}
          
          {/* Camera Overlay on Hover */}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Update Profile Picture</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Preview */}
              <div className="flex justify-center mb-6">
                <div className="w-40 h-40 rounded-full bg-gray-700 overflow-hidden">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                </div>
              </div>
              
              {/* File info */}
              {selectedFile && (
                <div className="text-center text-gray-300 text-sm mb-4">
                  <p>{selectedFile.name}</p>
                  <p className="text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose Different
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
              
              {user?.profilePicture?.url && (
                <button
                  onClick={handleRemove}
                  disabled={uploading}
                  className="w-full mt-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg transition duration-200"
                >
                  Remove Current Picture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePicture;