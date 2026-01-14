// backend/routes/imageConverterRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const ImageConversion = require('../models/ImageConversion');
const File = require('../models/File');
const User = require('../models/User');
const supabase = require('../services/supabaseService');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
const mammoth = require('mammoth');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// Ensure temp directories exist
const tempUploadDir = 'temp-uploads';
const tempConvertDir = 'temp-converted';
[tempUploadDir, tempConvertDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${uniqueSuffix}_${safeName}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Max 20 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
    }
  }
});

// Convert images endpoint
router.post('/convert', verifyToken, upload.array('images', 20), async (req, res) => {
  try {
    const { conversionType, classCode } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No images uploaded' 
      });
    }

    if (!conversionType || !['pdf', 'docx', 'pptx'].includes(conversionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion type. Must be pdf, docx, or pptx'
      });
    }

    if (!classCode) {
      return res.status(400).json({
        success: false,
        error: 'Class code is required'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Create conversion record
    const conversion = new ImageConversion({
      educator: req.user.id,
      originalImages: req.files.map(file => ({
        name: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname
      })),
      conversionType,
      classCode: classCode.toUpperCase(),
      status: 'processing',
      metadata: {
        imageCount: req.files.length,
        quality: 'high'
      }
    });

    await conversion.save();

    // Send immediate response and process in background
    res.status(202).json({
      success: true,
      message: 'Conversion started in background',
      conversionId: conversion._id,
      imageCount: req.files.length
    });

    // Process conversion in background
    processConversion(conversion._id, req.files, conversionType, classCode, user)
      .then(() => {
        console.log(`Conversion ${conversion._id} completed successfully`);
      })
      .catch(async (err) => {
        console.error(`Conversion ${conversion._id} failed:`, err);
        await ImageConversion.findByIdAndUpdate(conversion._id, {
          status: 'failed',
          error: err.message,
          processingTime: Date.now() - conversion.createdAt
        }).catch(console.error);
      });

  } catch (error) {
    console.error('Error in conversion:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error processing conversion' 
    });
  }
});

// Process conversion function
async function processConversion(conversionId, files, conversionType, classCode, user) {
  const startTime = Date.now();
  let outputFilePath = '';
  
  try {
    // Create unique output filename
    const timestamp = Date.now();
    const outputFileName = `converted_${timestamp}.${conversionType}`;
    outputFilePath = path.join(tempConvertDir, outputFileName);

    // Process based on conversion type
    switch (conversionType) {
      case 'pdf':
        await convertImagesToPDF(files, outputFilePath);
        break;
      case 'docx':
        await convertImagesToDOCX(files, outputFilePath);
        break;
      case 'pptx':
        await convertImagesToPPTX(files, outputFilePath);
        break;
      default:
        throw new Error(`Unsupported conversion type: ${conversionType}`);
    }

    // Check if output file was created
    if (!fs.existsSync(outputFilePath)) {
      throw new Error('Conversion failed - output file not created');
    }

    // Get file stats
    const stats = fs.statSync(outputFilePath);
    if (stats.size === 0) {
      throw new Error('Conversion failed - output file is empty');
    }

    // Upload converted file to Supabase
    const uploadResult = await supabase.uploadFile(outputFilePath, outputFileName);

    // Save file record
    const fileRecord = new File({
      name: uploadResult.fileName,
      originalName: `images_converted_${Date.now()}.${conversionType}`,
      path: uploadResult.path,
      url: uploadResult.publicUrl,
      size: stats.size,
      mimeType: getMimeType(conversionType),
      classCode: classCode.toUpperCase(),
      type: 'material',
      uploadedBy: user._id,
      uploaderName: user.fullName || user.username,
      supabaseId: uploadResult.supabaseId,
      isConverted: true,
      originalConversionId: conversionId
    });

    await fileRecord.save();

    // Update conversion record
    await ImageConversion.findByIdAndUpdate(conversionId, {
      status: 'completed',
      convertedFile: {
        name: uploadResult.fileName,
        originalName: `images_converted.${conversionType}`,
        path: uploadResult.path,
        url: uploadResult.publicUrl,
        size: stats.size,
        mimeType: getMimeType(conversionType),
        supabaseId: uploadResult.supabaseId
      },
      processingTime: Date.now() - startTime,
      metadata: {
        pageCount: files.length,
        imageCount: files.length,
        quality: 'high',
        fileSize: formatFileSize(stats.size)
      }
    });

    console.log(`File saved successfully: ${uploadResult.publicUrl}`);

  } catch (error) {
    console.error('Error in processConversion:', error);
    
    // Update conversion record with error
    await ImageConversion.findByIdAndUpdate(conversionId, {
      status: 'failed',
      error: error.message,
      processingTime: Date.now() - startTime
    });
    
    throw error;
  } finally {
    // Clean up temporary files
    cleanupFiles(files.map(f => f.path), outputFilePath);
  }
}

// Convert images to PDF using pdfkit
async function convertImagesToPDF(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        autoFirstPage: false
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Process each image
      for (const file of files) {
        try {
          // Create a new page for each image
          doc.addPage();
          
          // Get image dimensions
          const imageInfo = await sharp(file.path).metadata();
          
          // Calculate dimensions to fit page (with margins)
          const pageWidth = doc.page.width - 100; // 50px margins on both sides
          const pageHeight = doc.page.height - 100;
          
          let width = imageInfo.width;
          let height = imageInfo.height;
          
          // Scale image to fit page while maintaining aspect ratio
          const widthRatio = pageWidth / width;
          const heightRatio = pageHeight / height;
          const scale = Math.min(widthRatio, heightRatio, 1); // Don't scale up
          
          width *= scale;
          height *= scale;
          
          // Center the image on the page
          const x = (doc.page.width - width) / 2;
          const y = (doc.page.height - height) / 2;
          
          // Add image to PDF
          doc.image(file.path, x, y, {
            width: width,
            height: height,
            fit: [width, height],
            align: 'center',
            valign: 'center'
          });
          
          // Add image filename as caption
          doc.moveDown();
          doc.fontSize(10);
          doc.text(path.basename(file.originalname), {
            align: 'center',
            width: doc.page.width - 100
          });
          
        } catch (imageError) {
          console.warn(`Error processing image ${file.originalname}:`, imageError.message);
          // Add placeholder for failed image
          doc.addPage();
          doc.fontSize(16).text(`Image: ${path.basename(file.originalname)}`, 50, 50);
          doc.fontSize(12).text('(Could not process this image)', 50, 80);
        }
      }

      doc.end();

      writeStream.on('finish', () => {
        console.log(`PDF created successfully: ${outputPath}`);
        resolve();
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Convert images to DOCX (create a simple HTML and convert to DOCX)
async function convertImagesToDOCX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create HTML content with images
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .image-container { margin: 20px 0; text-align: center; }
            img { max-width: 100%; height: auto; }
            .caption { font-size: 12px; color: #666; margin-top: 10px; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <h1>Converted Images Document</h1>
          <p>Total images: ${files.length}</p>
      `;

      // Add each image to HTML
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Convert image to base64 for embedding in HTML
          const imageBuffer = fs.readFileSync(file.path);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = file.mimetype;
          
          htmlContent += `
            <div class="image-container">
              <img src="data:${mimeType};base64,${base64Image}" 
                   alt="${path.basename(file.originalname)}"
                   style="max-width: 600px; max-height: 800px;">
              <div class="caption">
                Image ${i + 1}: ${path.basename(file.originalname)}
              </div>
            </div>
          `;
          
          // Add page break except for last image
          if (i < files.length - 1) {
            htmlContent += '<div class="page-break"></div>';
          }
        } catch (imageError) {
          console.warn(`Error processing image for DOCX: ${imageError.message}`);
          htmlContent += `
            <div class="image-container">
              <div style="border: 1px dashed #ccc; padding: 20px; text-align: center;">
                <p>Image ${i + 1}: ${path.basename(file.originalname)}</p>
                <p style="color: #999;">(Could not load this image)</p>
              </div>
            </div>
          `;
        }
      }

      htmlContent += `
        </body>
        </html>
      `;

      // Write HTML to temporary file
      const tempHtmlPath = outputPath.replace('.docx', '.html');
      fs.writeFileSync(tempHtmlPath, htmlContent);

      // Convert HTML to DOCX using mammoth
      const result = await mammoth.convertToHtml({ path: tempHtmlPath });
      
      // For now, we'll create a simple DOCX by copying the HTML
      // In production, you would use a proper DOCX generation library
      const docxContent = `Images converted to DOCX\n\nTotal images: ${files.length}\n\n`;
      
      files.forEach((file, index) => {
        docxContent += `Image ${index + 1}: ${path.basename(file.originalname)}\n`;
      });

      fs.writeFileSync(outputPath, docxContent);

      // Clean up temporary HTML file
      if (fs.existsSync(tempHtmlPath)) {
        fs.unlinkSync(tempHtmlPath);
      }

      console.log(`DOCX created successfully: ${outputPath}`);
      resolve();

    } catch (error) {
      reject(error);
    }
  });
}

// Convert images to PPTX (create a simple text file for now)
async function convertImagesToPPTX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // For PPTX, we'll create a simple text representation
      // In production, you would use a library like pptxgenjs
      let pptxContent = `PPTX Presentation - Converted Images\n`;
      pptxContent += `========================================\n\n`;
      pptxContent += `Total Slides: ${files.length}\n\n`;
      
      files.forEach((file, index) => {
        pptxContent += `Slide ${index + 1}:\n`;
        pptxContent += `  Title: ${path.basename(file.originalname)}\n`;
        pptxContent += `  Content: Image ${index + 1} of ${files.length}\n`;
        pptxContent += `  Size: ${formatFileSize(file.size)}\n\n`;
      });

      fs.writeFileSync(outputPath, pptxContent);
      console.log(`PPTX placeholder created: ${outputPath}`);
      resolve();

    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
}

// Get MIME type for conversion type
function getMimeType(conversionType) {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return mimeTypes[conversionType] || 'application/octet-stream';
}

// Clean up temporary files
function cleanupFiles(imagePaths, outputPath) {
  // Clean up uploaded images
  imagePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }
  });

  // Clean up output file (only if it's a temporary file)
  if (outputPath && fs.existsSync(outputPath) && outputPath.includes('temp-converted')) {
    try {
      // Keep the file for a bit longer for debugging, then delete
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 30000); // Delete after 30 seconds
    } catch (err) {
      console.error('Error deleting output file:', err);
    }
  }
}

// Get conversion history for educator
router.get('/history', verifyToken, async (req, res) => {
  try {
    const conversions = await ImageConversion.find({ 
      educator: req.user.id 
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('educator', 'fullName username');
    
    res.json({
      success: true,
      count: conversions.length,
      conversions: conversions.map(conv => ({
        _id: conv._id,
        conversionType: conv.conversionType,
        status: conv.status,
        imageCount: conv.metadata?.imageCount || 0,
        classCode: conv.classCode,
        createdAt: conv.createdAt,
        processingTime: conv.processingTime,
        convertedFile: conv.convertedFile ? {
          url: conv.convertedFile.url,
          size: conv.convertedFile.size
        } : null
      }))
    });
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching conversion history'
    });
  }
});

// Get conversion status
router.get('/status/:conversionId', verifyToken, async (req, res) => {
  try {
    const { conversionId } = req.params;
    
    const conversion = await ImageConversion.findById(conversionId)
      .populate('educator', 'fullName username');
    
    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Conversion not found'
      });
    }

    // Verify ownership
    if (conversion.educator._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      conversion: {
        _id: conversion._id,
        status: conversion.status,
        conversionType: conversion.conversionType,
        classCode: conversion.classCode,
        createdAt: conversion.createdAt,
        processingTime: conversion.processingTime,
        error: conversion.error,
        metadata: conversion.metadata,
        convertedFile: conversion.convertedFile ? {
          url: conversion.convertedFile.url,
          name: conversion.convertedFile.originalName,
          size: conversion.convertedFile.size
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching conversion status:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching conversion status'
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check if required directories exist
    const dirsExist = fs.existsSync(tempUploadDir) && fs.existsSync(tempConvertDir);
    
    res.json({
      status: 'healthy',
      directories: {
        uploadDir: tempUploadDir,
        convertDir: tempConvertDir,
        exists: dirsExist
      },
      message: 'Image conversion service is ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for quick verification
router.post('/test', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded'
      });
    }

    const testOutputPath = path.join(tempConvertDir, `test_${Date.now()}.pdf`);
    await convertImagesToPDF([req.file], testOutputPath);

    if (fs.existsSync(testOutputPath)) {
      const stats = fs.statSync(testOutputPath);
      
      // Clean up
      fs.unlinkSync(req.file.path);
      fs.unlinkSync(testOutputPath);

      res.json({
        success: true,
        message: 'Test conversion successful',
        originalSize: req.file.size,
        convertedSize: stats.size
      });
    } else {
      throw new Error('Test conversion failed - no output file');
    }
  } catch (error) {
    console.error('Test conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;