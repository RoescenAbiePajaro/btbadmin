const { supabase } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

class SupabaseService {
  constructor() {
    this.bucketName = 'class-files';
  }

  // Upload file to Supabase Storage
  async uploadFile(filePath, originalName) {
    try {
      const file = fs.readFileSync(filePath);
      const fileExt = path.extname(originalName);
      const fileBaseName = path.basename(originalName, fileExt);
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const uniqueFileName = `${fileBaseName}-${uniqueSuffix}${fileExt}`;
      
      // Sanitize filename for Supabase
      const safeFileName = uniqueFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(safeFileName, file, {
          contentType: this.getMimeType(fileExt),
          upsert: false
        });
      
      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(safeFileName);
      
      return {
        path: data.path,
        publicUrl,
        bucket: this.bucketName,
        fileName: safeFileName,
        originalName: originalName
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
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
      '.rar': 'application/x-rar-compressed'
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