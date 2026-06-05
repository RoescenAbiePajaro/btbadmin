// src/components/educator/EducatorProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfilePicture from '../ProfilePicture';
import { Save, Edit2, X, Check } from 'lucide-react';

const EducatorProfileSettings = ({ user, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    school: '',
    homeAddress: '',
    cellphoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        username: user.username || '',
        school: user.school || '',
        homeAddress: user.homeAddress || '',
        cellphoneNumber: user.cellphoneNumber || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_URL || 'https://btbtestservice.onrender.com'}/api/profile/educator/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.toast?.type === 'success') {
        // Update local storage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...userData, ...response.data.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (onProfileUpdate) onProfileUpdate(updatedUser);
        
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Update error:', error);
      if (error.response?.data?.toast?.message) {
        alert(error.response.data.toast.message);
      } else {
        alert('Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpdate = (newProfilePicture) => {
    if (onProfileUpdate) {
      const updatedUser = { ...user, profilePicture: newProfilePicture };
      onProfileUpdate(updatedUser);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Edit Profile</h3>
          <button
            onClick={() => setIsEditing(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              School
            </label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Home Address
            </label>
            <textarea
              name="homeAddress"
              value={formData.homeAddress}
              onChange={handleChange}
              rows="3"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1">
              Cellphone Number
            </label>
            <input
              type="tel"
              name="cellphoneNumber"
              value={formData.cellphoneNumber}
              onChange={handleChange}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      {/* Profile Picture Section */}
      <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-700">
        <ProfilePicture 
          user={user} 
          onUpdate={handleProfilePictureUpdate}
          size="xl"
        />
        <h2 className="text-xl font-bold text-white mt-4">{user?.fullName}</h2>
        <p className="text-gray-400 capitalize">{user?.role}</p>
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Profile Information</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-sm">Full Name</label>
            <p className="text-white">{user?.fullName || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm">Email</label>
            <p className="text-white">{user?.email || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm">Username</label>
            <p className="text-white">{user?.username || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm">School</label>
            <p className="text-white">{user?.school || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm">Home Address</label>
            <p className="text-white whitespace-pre-wrap">{user?.homeAddress || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-gray-400 text-sm">Cellphone Number</label>
            <p className="text-white">{user?.cellphoneNumber || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducatorProfileSettings;