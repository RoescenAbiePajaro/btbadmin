// backend/services/supabaseService.js
const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

class SupabaseService {
  constructor() {
    this.bucketName = 'class-files';
  }

  async ensureBucket() {
    try {
      console.log('Checking if bucket exists:', this.bucketName);
      
      // Try to get bucket info
      const { data: bucketInfo, error: checkError } = await supabase.storage
        .getBucket(this.bucketName);
      
      if (checkError) {
        // Bucket doesn't exist, try to create it
        console.log('Bucket not found, attempting to create...');
        
        const { data: newBucket, error: createError } = await supabase.storage
          .createBucket(this.bucketName, {
            public: true,
            fileSizeLimit: 52428800 // 50MB
          });
          
        if (createError) {
          // If creation fails due to RLS, try using REST API with service role key
          console.log('Creation failed, trying alternative method...');
          await this.createBucketWithServiceRole();
        } else {
          console.log('Bucket created successfully:', newBucket);
        }
      } else {
        console.log('Bucket already exists:', bucketInfo);
      }
      
      // Update bucket to be public if not already
      const { error: updateError } = await supabase.storage
        .updateBucket(this.bucketName, {
          public: true
        });
        
      if (updateError) {
        console.warn('Could not update bucket settings:', updateError.message);
      }
      
    } catch (error) {
      console.warn('Note: Bucket creation/check failed:', error.message);
      console.log('This is usually due to RLS policies. Please create the bucket manually in Supabase dashboard.');
    }
  }

  // Alternative method using REST API with service role key
  async createBucketWithServiceRole() {
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase URL and Service Role Key are required');
      }
      
      const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({
          name: this.bucketName,
          id: this.bucketName,
          public: true,
          file_size_limit: 52428800
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create bucket: ${errorText}`);
      }
      
      console.log('Bucket created using service role key');
    } catch (error) {
      console.error('Failed to create bucket with service role:', error.message);
    }
  }

  async uploadFile(filePath, originalName) {
    try {
      // Read file
      const file = fs.readFileSync(filePath);
      const fileExt = path.extname(originalName);
      const fileBaseName = path.basename(originalName, fileExt);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const safeBaseName = fileBaseName.replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueFileName = `${timestamp}_${randomSuffix}_${safeBaseName}${fileExt}`;
      
      console.log('Uploading file to Supabase:', uniqueFileName);
      
      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(uniqueFileName, file, {
          contentType: this.getMimeType(fileExt),
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Supabase upload error:', error);
        
        // Try with alternative bucket name if default fails
        if (error.message.includes('bucket') || error.message.includes('RLS')) {
          console.log('Trying alternative bucket...');
          return await this.uploadToAlternativeBucket(file, uniqueFileName, originalName, fileExt);
        }
        
        throw error;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(uniqueFileName);
      
      console.log('File uploaded successfully:', publicUrl);
      
      return {
        path: data.path,
        publicUrl,
        bucket: this.bucketName,
        fileName: uniqueFileName,
        originalName: originalName,
        supabaseId: data.id || timestamp.toString()
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Alternative upload method
  async uploadToAlternativeBucket(file, fileName, originalName, fileExt) {
    const alternativeBucket = 'uploads'; // Common default bucket name
    
    try {
      const { data, error } = await supabase.storage
        .from(alternativeBucket)
        .upload(fileName, file, {
          contentType: this.getMimeType(fileExt),
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from(alternativeBucket)
        .getPublicUrl(fileName);
      
      return {
        path: data.path,
        publicUrl,
        bucket: alternativeBucket,
        fileName: fileName,
        originalName: originalName,
        supabaseId: data.id || Date.now().toString()
      };
    } catch (uploadError) {
      console.error('Alternative bucket upload failed:', uploadError);
      throw new Error(`Upload failed. Please ensure you have created a bucket named '${this.bucketName}' in Supabase Storage and disabled RLS policies.`);
    }
  }

  // Get MIME type from extension
  getMimeType(extension) {
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.wmv': 'video/x-ms-wmv',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.svg': 'image/svg+xml'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  // Delete file from storage
  async deleteFile(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // List files (not used much since we store in DB)
  async listFiles() {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list();
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Get file URL
  getFileUrl(filePath) {
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
}

module.exports = new SupabaseService();