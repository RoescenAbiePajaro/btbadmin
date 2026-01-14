// src/routes/api/saved-images/educator.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get authorization token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        success: false, 
        message: 'Server configuration error' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token (you might need to decode JWT or verify with your auth system)
    // For now, we'll get user from the token in a simplified way
    // In production, you should verify the JWT properly
    let userEmail = '';
    
    // Try to decode the token or extract user info
    // This is a simplified version - you should implement proper JWT verification
    try {
      // If your token is a JWT, decode it
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userEmail = decoded.email || '';
    } catch (e) {
      // If token is not JWT, try to get user from local storage data
      // This is just for demo - implement proper auth in production
      console.log('Token decoding failed, using default');
    }

    // Fetch saved images from Supabase
    let query = supabase
      .from('saved_images')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user if email is available
    if (userEmail) {
      query = query.eq('user_email', userEmail.toLowerCase());
    }

    const { data: images, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching images from database' 
      });
    }

    // Format the response
    const formattedImages = images.map(img => ({
      id: img.id,
      file_name: img.file_name,
      image_url: img.image_url,
      user_email: img.user_email,
      user_role: img.user_role,
      image_type: img.image_type,
      file_size: img.file_size,
      created_at: img.created_at,
      storage_path: img.storage_path,
      original_path: img.original_path
    }));

    return res.status(200).json({
      success: true,
      images: formattedImages,
      count: formattedImages.length
    });

  } catch (error) {
    console.error('Error in educator images API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}s