// src/components/educator/ImageConverter.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Toast from '../Toast';

const ImageConverter = ({ educatorId }) => {
  const [images, setImages] = useState([]);
  const [conversionType, setConversionType] = useState('pdf');
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [classCodes, setClassCodes] = useState([]);
  const [selectedClassCode, setSelectedClassCode] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const fileInputRef = useRef(null);

  const MAX_IMAGES = 20;

  useEffect(() => {
    fetchClassCodes();
  }, [educatorId]);

  useEffect(() => {
    if (selectedClassCode) {
      fetchFolders(selectedClassCode);
    }
  }, [selectedClassCode]);

  useEffect(() => {
    if (converting) {
      const checkInterval = setInterval(async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            'https://btbtestservice.onrender.com/api/files/list',
            { 
              headers: { Authorization: `Bearer ${token}` },
              params: { classCode: selectedClassCode }
            }
          );
          
          const convertedFiles = response.data.files?.filter(file => 
            file.isConverted && file.conversionType === conversionType
          );
          
          if (convertedFiles && convertedFiles.length > 0) {
            const latestFile = convertedFiles[0];
            if (latestFile.createdAt > Date.now() - 60000) { // Created in last minute
              showToast(`File converted and shared successfully!`, 'success');
              setConverting(false);
              setConversionProgress(100);
              clearInterval(checkInterval);
            }
          }
        } catch (error) {
          console.error('Error checking conversion status:', error);
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(checkInterval);
    }
  }, [converting, selectedClassCode, conversionType]);

  const fetchClassCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/classes/my-classes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.data?.classes) {
        setClassCodes(response.data.data.classes);
        if (response.data.data.classes.length > 0) {
          setSelectedClassCode(response.data.data.classes[0].classCode);
        }
      }
    } catch (error) {
      console.error('Error fetching class codes:', error.response?.data || error.message);
      showToast('Failed to load classes', 'error');
    }
  };

  const fetchFolders = async (classCode) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !classCode) return;
      
      const response = await axios.get(
        `https://btbtestservice.onrender.com/api/folders?classCode=${classCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setFolders(response.data.folders || []);
        // Reset selected folder if it's not in the new class
        if (selectedFolder && !response.data.folders.find(f => f._id === selectedFolder._id)) {
          setSelectedFolder(null);
        }
      } else {
        console.error('Failed to fetch folders:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching folders:', error.response?.data || error.message);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const remainingSlots = MAX_IMAGES - images.length;
    
    if (files.length > remainingSlots) {
      showToast(`You can only upload up to ${MAX_IMAGES} images total. ${remainingSlots} slots remaining.`, 'warning');
      return;
    }

    const newImages = files.slice(0, remainingSlots).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      id: Date.now() + Math.random()
    }));

    setImages(prev => [...prev, ...newImages]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const reorderImage = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setImages(newImages);
  };

  const convertImages = async () => {
    if (images.length === 0) {
      showToast('Please upload at least one image', 'error');
      return;
    }

    if (!selectedClassCode) {
      showToast('Please select a class', 'error');
      return;
    }

    if (!selectedFolder) {
      showToast('Please select a folder for the conversion', 'error');
      return;
    }

    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image.file);
    });
    formData.append('conversionType', conversionType);
    formData.append('classCode', selectedClassCode);
    formData.append('folderId', selectedFolder._id);

    try {
      setConverting(true);
      setConversionProgress(0);
      
      const token = localStorage.getItem('token');

      // Update progress for upload
      setConversionProgress(10);
      
      const response = await axios.post(
        'https://btbtestservice.onrender.com/api/image-converter/convert',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}` 
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Cap at 90% to leave room for processing
            setConversionProgress(Math.min(90, percentCompleted));
          }
        }
      );

      if (response.data.success) {
        showToast(`Images conversion started! The ${conversionType.toUpperCase()} file will be shared with the class shortly.`, 'success');
        setConversionProgress(95);
        
        // Start polling for completion
        const conversionId = response.data.conversionId;
        if (conversionId) {
          pollConversionStatus(conversionId);
        } else {
          // Fallback: just clear images after delay
          setTimeout(() => {
            setImages([]);
            setConversionProgress(100);
            setTimeout(() => setConversionProgress(0), 2000);
            setConverting(false);
          }, 3000);
        }
      } else {
        throw new Error(response.data.error || 'Conversion failed to start');
      }
    } catch (error) {
      console.error('Error converting images:', error);
      showToast(error.response?.data?.error || error.message || 'Failed to convert images', 'error');
      setConverting(false);
      setConversionProgress(0);
    }
  };

  // Add polling function
  const pollConversionStatus = async (conversionId) => {
    const maxAttempts = 30; // 30 attempts * 3 seconds = 90 seconds max
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `https://btbtestservice.onrender.com/api/image-converter/status/${conversionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          const { status, convertedFile, error } = response.data.conversion;
          
          if (status === 'completed') {
            showToast(`File converted and shared successfully!`, 'success');
            setImages([]);
            setConversionProgress(100);
            setConverting(false);
            setTimeout(() => setConversionProgress(0), 2000);
            return true;
          } else if (status === 'failed') {
            showToast(`Conversion failed: ${error}`, 'error');
            setConverting(false);
            setConversionProgress(0);
            return true;
          }
          // Still processing, continue polling
        }
      } catch (error) {
        console.error('Error checking conversion status:', error);
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        showToast('Conversion is taking longer than expected. Please check your files later.', 'warning');
        setConverting(false);
        setConversionProgress(0);
        return true;
      }
      
      // Continue polling after 3 seconds
      setTimeout(checkStatus, 3000);
      return false;
    };
    
    // Start polling
    setTimeout(checkStatus, 3000);
  };

  const downloadSampleFile = () => {
    // Create a sample file based on conversion type
    let sampleContent = '';
    let fileName = '';
    let mimeType = '';

    switch (conversionType) {
      case 'pdf':
        // Create a simple PDF content (this is just a text representation)
        sampleContent = 'Sample PDF Content\n\nThis is a sample PDF file created from images.';
        fileName = 'sample-converted.pdf';
        mimeType = 'application/pdf';
        break;
      case 'pptx':
        sampleContent = 'Sample PPTX Content\n\nThis is a sample PPTX file created from images.';
        fileName = 'sample-converted.pptx';
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      default:
        return;
    }

    const blob = new Blob([sampleContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden transition-all duration-300 hover:border-pink-500/30">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-pink-500/10 mr-4">
              <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4 4 0 003 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Image Converter</h3>
              <p className="text-gray-400 text-sm">Convert multiple images to PDF or PPTX</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Conversion Type Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Convert to:
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setConversionType('pdf')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center ${
                  conversionType === 'pdf'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-600 hover:border-pink-500/50 hover:bg-gray-750'
                }`}
              >
                <div className="mb-2 p-2 bg-red-500/10 rounded-full">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-white font-medium">PDF</span>
                <span className="text-xs text-gray-400 mt-1">Portable Document Format</span>
              </button>
              
              <button
                onClick={() => setConversionType('pptx')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center ${
                  conversionType === 'pptx'
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-600 hover:border-pink-500/50 hover:bg-gray-750'
                }`}
              >
                <div className="mb-2 p-2 bg-orange-500/10 rounded-full">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-white font-medium">PPTX</span>
                <span className="text-xs text-gray-400 mt-1">Microsoft PowerPoint</span>
              </button>
            </div>
          </div>

          {/* Class Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Share with Class
              <span className="text-red-400 ml-1">*</span>
            </label>
            {classCodes.length === 0 ? (
              <div className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-center">
                <p className="text-gray-300">No classes available.</p>
                <p className="text-sm text-gray-400 mt-1">Create a class first to share converted files.</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedClassCode}
                  onChange={(e) => setSelectedClassCode(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none"
                >
                  <option value="">Select a class</option>
                  {classCodes.map((classItem) => (
                    <option key={classItem._id} value={classItem.classCode}>
                      {classItem.className} ({classItem.classCode}) - {classItem.description || 'No batch'}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Select Folder
              <span className="text-red-400 ml-1">*</span>
            </label>
            {!selectedClassCode ? (
              <div className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-center">
                <p className="text-gray-300">Select a class first to choose a folder.</p>
              </div>
            ) : folders.filter(f => !f.parentId).length === 0 ? (
              <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-400 text-sm">
                Create a folder first in File Sharing to convert images.
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedFolder?._id || ''}
                  onChange={(e) => {
                    const folder = folders.find(f => f._id === e.target.value);
                    setSelectedFolder(folder || null);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none"
                >
                  <option value="">Select a folder (required)</option>
                  {folders
                    .filter(f => !f.parentId)
                    .sort((a, b) => (a.path || a.name).localeCompare(b.path || b.name))
                    .map((folder) => (
                      <option key={folder._id} value={folder._id}>
                        📁 {folder.path || folder.name}
                      </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Upload Images (Max {MAX_IMAGES})
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-pink-500 transition-colors duration-200">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-1 text-sm text-gray-400">
                  <span className="font-medium text-pink-400 hover:text-pink-300">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, GIF, WEBP (Max 10MB each)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {images.length} / {MAX_IMAGES} images uploaded
                </p>
              </label>
            </div>
          </div>

          {/* Uploaded Images Preview */}
          {images.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">Uploaded Images ({images.length})</h4>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Drag to reorder images
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      reorderImage(fromIndex, index);
                    }}
                    className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600 hover:border-pink-500 transition-all duration-200"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <button
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200 p-2 bg-red-500 hover:bg-red-600 rounded-full"
                        >
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-white text-sm truncate" title={image.name}>
                        {image.name}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(image.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Clear All Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setImages([])}
                  className="px-4 py-2 text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  Clear All Images
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {conversionProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Conversion Progress</span>
                <span className="text-pink-400">{conversionProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${conversionProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={convertImages}
              disabled={converting || images.length === 0 || !selectedClassCode || !selectedFolder}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                converting || images.length === 0 || !selectedClassCode || !selectedFolder
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white hover:from-pink-700 hover:to-indigo-700 shadow-lg hover:shadow-pink-500/20'
              }`}
            >
              {converting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Converting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4 4 0 003 15z" />
                  </svg>
                  Convert to {conversionType.toUpperCase()}
                </>
              )}
            </button>
          </div>

          {toast.show && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default ImageConverter;