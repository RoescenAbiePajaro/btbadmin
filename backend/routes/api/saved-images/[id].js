// src/routes/api/saved-images/[id].js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.query;

  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get authorization token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, get the image to check ownership
    const { data: image, error: fetchError } = await supabase
      .from('saved_images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    // TODO: Add user verification logic here
    // Verify that the user owns this image before deleting

    // Delete from database
    const { error: deleteError } = await supabase
      .from('saved_images')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error deleting image from database' 
      });
    }

    // Optionally, also delete from storage
    try {
      await supabase.storage
        .from('class-files')
        .remove([image.storage_path]);
    } catch (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue even if storage delete fails
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}