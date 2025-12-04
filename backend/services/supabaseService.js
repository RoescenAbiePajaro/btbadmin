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
          public: false, // Set to true if you want public access
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
            'video/mp4',
            'audio/mpeg'
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

  // Upload file to Supabase
  async uploadFile(file, folderPath = '') {
    try {
      // Ensure bucket exists
      await this.initializeBucket();
      
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      // Convert buffer to readable stream
      const fileBuffer = fs.readFileSync(file.path);
      
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600'
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      
      // Clean up local file
      fs.unlinkSync(file.path);
      
      return {
        fileName: file.originalname,
        supabaseId: data.id,
        filePath: filePath,
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
        fileType: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }
  }

  // Get file URL (signed URL for private buckets)
  async getFileUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
      
      if (error) throw error;
      
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  // Download file
  async downloadFile(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  // Delete file from Supabase
  async deleteFile(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error deleting file:', error);
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