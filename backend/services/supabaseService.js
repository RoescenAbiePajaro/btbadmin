// backend/services/supabaseService.js

const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

class SupabaseService {
  constructor() {
    this.bucketName = 'class-files';
  }

  // Initialize bucket (run once manually or on first upload)
  async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) throw listError;
      
      const bucketExists = buckets.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true, // Enable public access
          fileSizeLimit: 52428800, // 50MB limit
          allowedMimeTypes: [
            'image/*',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'application/zip',
            'application/x-rar-compressed',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          ]
        });
        
        if (createError && createError.message !== 'Bucket already exists') {
          throw createError;
        }
        
        console.log(`Bucket "${this.bucketName}" initialized successfully`);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing bucket:', error);
      throw error;
    }
  }

  // Upload file to Supabase Storage
  async uploadFile(filePath, destinationPath) {
    try {
      const file = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName);
      const fileBaseName = path.basename(fileName, fileExt);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const uniqueFileName = `${fileBaseName}-${uniqueSuffix}${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, file);
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);
      
      return {
        path: data.path,
        publicUrl,
        bucket: this.bucketName,
        fileName: uniqueFileName
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get file URL
  async getFileUrl(filePath) {
    try {
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  }

  // List files in a folder
  async listFiles(folderPath = '') {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list(folderPath);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();