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
const PptxGenJS = require('pptxgenjs');

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
    console.log('Conversion request received:', {
      filesCount: req.files ? req.files.length : 0,
      conversionType: req.body.conversionType,
      classCode: req.body.classCode,
      folderId: req.body.folderId,
      user: req.user.id
    });

    const { conversionType, classCode, folderId } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No images uploaded' 
      });
    }

    if (!conversionType || !['pdf', 'pptx'].includes(conversionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversion type. Must be pdf or pptx'
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

    // Validate folderId if provided
    let validatedFolderId = null;
    if (folderId) {
      const Folder = require('../models/Folder');
      const folder = await Folder.findOne({
        _id: folderId,
        educatorId: req.user.id,
        classCode: classCode.toUpperCase(),
        isDeleted: false
      });
      
      if (!folder) {
        return res.status(400).json({
          success: false,
          error: 'Invalid folder selected'
        });
      }
      
      validatedFolderId = folderId;
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
      folderId: validatedFolderId,
      status: 'processing',
      metadata: {
        imageCount: req.files.length,
        quality: 'high'
      }
    });

    await conversion.save();

    console.log(`Conversion ${conversion._id} saved, starting background processing`);

    // Send immediate response
    res.status(202).json({
      success: true,
      message: 'Conversion started in background',
      conversionId: conversion._id,
      imageCount: req.files.length,
      status: 'processing'
    });

    // Process conversion in background with error handling
    setTimeout(async () => {
      try {
        await processConversion(conversion._id, req.files, conversionType, classCode, user, validatedFolderId);
        console.log(`Conversion ${conversion._id} completed successfully`);
      } catch (bgError) {
        console.error(`Background conversion ${conversion._id} failed:`, bgError);
        await ImageConversion.findByIdAndUpdate(conversion._id, {
          status: 'failed',
          error: bgError.message,
          processingTime: Date.now() - conversion.createdAt
        }).catch(console.error);
      }
    }, 100);

  } catch (error) {
    console.error('Error in conversion endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error processing conversion',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Process conversion function
async function processConversion(conversionId, files, conversionType, classCode, user, folderId = null) {
  const startTime = Date.now();
  let outputFilePath = '';
  
  try {
    console.log(`Processing conversion ${conversionId} for ${files.length} images`);
    
    // Create unique output filename
    const timestamp = Date.now();
    const outputFileName = `converted_${timestamp}.${conversionType}`;
    outputFilePath = path.join(tempConvertDir, outputFileName);

    // Process based on conversion type
    let result;
    try {
      switch (conversionType) {
        case 'pdf':
          // Try pdfkit first, fallback to pdf-lib if it fails
          try {
            result = await convertImagesToPDF(files, outputFilePath);
          } catch (pdfkitError) {
            console.warn('PDFKit failed, trying alternative:', pdfkitError.message);
            result = await convertImagesToPDFWithPDFLib(files, outputFilePath);
          }
          break;
        case 'pptx':
          // Try the full version first, then fallback
          try {
            result = await convertImagesToPPTX(files, outputFilePath);
          } catch (pptxError) {
            console.warn('Full PPTX conversion failed, using simple version:', pptxError.message);
            result = await convertImagesToSimplePPTX(files, outputFilePath);
          }
          break;
        default:
          throw new Error(`Unsupported conversion type: ${conversionType}`);
      }
    } catch (conversionError) {
      console.error('Conversion failed:', conversionError);
      throw new Error(`Failed to convert images: ${conversionError.message}`);
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

    console.log(`File created: ${outputFilePath}, size: ${stats.size} bytes`);

    // Upload converted file to Supabase
    const uploadResult = await supabase.uploadFile(outputFilePath, outputFileName);
    
    console.log('Uploaded to Supabase:', uploadResult);

    // Save file record
    const fileRecord = new File({
      name: uploadResult.fileName,
      originalName: `images_converted_${Date.now()}.${conversionType}`,
      path: uploadResult.path,
      url: uploadResult.publicUrl,
      size: stats.size,
      mimeType: getMimeType(conversionType),
      classCode: classCode.toUpperCase(),
      folderId: folderId,
      type: 'material',
      uploadedBy: user._id,
      uploaderName: user.fullName || user.username,
      supabaseId: uploadResult.supabaseId,
      isConverted: true,
      originalConversionId: conversionId,
      conversionType: conversionType,
      originalImageCount: files.length
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

    console.log(`File saved to database: ${fileRecord._id}`);

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
    try {
      files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      if (outputFilePath && fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
  }
}

// ===========================
// PDF CONVERSION FUNCTIONS
// ===========================

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

// Alternative PDF conversion using pdf-lib
async function convertImagesToPDFWithPDFLib(files, outputPath) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFLibDocument.create();
    
    // Process each image
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Read image file
        let imageBytes = fs.readFileSync(file.path);
        
        // Determine image type
        let imageType;
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
          imageType = 'jpg';
        } else if (file.mimetype === 'image/png') {
          imageType = 'png';
        } else {
          // Convert other formats to PNG using sharp
          const pngBuffer = await sharp(file.path).png().toBuffer();
          imageBytes = pngBuffer;
          imageType = 'png';
        }
        
        // Embed the image
        let image;
        if (imageType === 'jpg') {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          image = await pdfDoc.embedPng(imageBytes);
        }
        
        // Add a page (A4 size: 595 x 842 points)
        const page = pdfDoc.addPage([595, 842]);
        
        // Calculate image dimensions to fit page (with margins)
        const margin = 50;
        const maxWidth = 595 - (margin * 2);
        const maxHeight = 842 - (margin * 2);
        
        let imageWidth = image.width;
        let imageHeight = image.height;
        
        // Scale to fit while maintaining aspect ratio
        const widthRatio = maxWidth / imageWidth;
        const heightRatio = maxHeight / imageHeight;
        const scale = Math.min(widthRatio, heightRatio, 1);
        
        imageWidth *= scale;
        imageHeight *= scale;
        
        // Center the image
        const x = (595 - imageWidth) / 2;
        const y = (842 - imageHeight) / 2;
        
        // Draw image
        page.drawImage(image, {
          x,
          y,
          width: imageWidth,
          height: imageHeight,
        });
        
        // Add filename as caption
        page.drawText(`Image ${i + 1}: ${path.basename(file.originalname)}`, {
          x: margin,
          y: margin / 2,
          size: 10,
        });
        
      } catch (imageError) {
        console.warn(`Error processing image ${file.originalname}:`, imageError.message);
        // Add placeholder page
        const page = pdfDoc.addPage([595, 842]);
        page.drawText(`Image ${i + 1}: ${path.basename(file.originalname)}`, {
          x: 50,
          y: 500,
          size: 16,
        });
        page.drawText('(Could not process this image)', {
          x: 50,
          y: 470,
          size: 12,
        });
      }
    }
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`PDF (pdf-lib) created successfully: ${outputPath}`);
    
  } catch (error) {
    throw new Error(`PDF creation failed with pdf-lib: ${error.message}`);
  }
}

// ===========================
// PPTX CONVERSION FUNCTIONS
// ===========================

// Convert images to PPTX using pptxgenjs
async function convertImagesToPPTX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a new presentation
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.title = 'Converted Images Presentation';
      pptx.author = 'EduPulse Image Converter';
      pptx.company = 'EduPulse';
      pptx.subject = 'Image Conversion';
      pptx.revision = '1.0';
      
      // Set slide size (16:9 widescreen)
      pptx.layout = 'LAYOUT_WIDE';
      
      // Add a title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(
        'Converted Images Presentation',
        {
          x: 0.5,
          y: 1.0,
          w: 9.0,
          h: 1.5,
          fontSize: 44,
          bold: true,
          align: 'center',
          color: '000000'
        }
      );
      
      titleSlide.addText(
        `Total Images: ${files.length}`,
        {
          x: 0.5,
          y: 3.0,
          w: 9.0,
          h: 1.0,
          fontSize: 28,
          align: 'center',
          color: '666666'
        }
      );
      
      titleSlide.addText(
        'Generated by EduPulse Image Converter',
        {
          x: 0.5,
          y: 6.0,
          w: 9.0,
          h: 0.5,
          fontSize: 14,
          align: 'center',
          color: '999999'
        }
      );
      
      // Process each image as a slide
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Create a new slide
          const slide = pptx.addSlide();
          
          // Add slide title
          slide.addText(`Slide ${i + 1}`, {
            x: 0.5,
            y: 0.2,
            w: 9.0,
            h: 0.5,
            fontSize: 18,
            bold: true,
            color: '666666',
            align: 'center'
          });
          
          // Add image title
          slide.addText(path.basename(file.originalname), {
            x: 0.5,
            y: 0.8,
            w: 9.0,
            h: 0.8,
            fontSize: 32,
            bold: true,
            align: 'center'
          });
          
          // Read and convert image to base64
          const imageBuffer = fs.readFileSync(file.path);
          const base64Image = imageBuffer.toString('base64');
          
          // Add image to slide (centered)
          slide.addImage({
            data: `data:${file.mimetype};base64,${base64Image}`,
            x: 1.0,
            y: 2.0,
            w: 8.0,
            h: 4.5,
            sizing: { type: 'contain' }
          });
          
          // Add footer with image info
          slide.addText(
            `Image ${i + 1} of ${files.length} | Size: ${formatFileSize(file.size)}`,
            {
              x: 0.5,
              y: 7.0,
              w: 9.0,
              h: 0.5,
              fontSize: 12,
              color: '666666',
              align: 'center'
            }
          );
          
        } catch (imageError) {
          console.warn(`Error processing image for PPTX: ${imageError.message}`);
          
          // Create error slide
          const errorSlide = pptx.addSlide();
          errorSlide.addText(
            `Slide ${i + 1}`,
            {
              x: 0.5,
              y: 0.2,
              w: 9.0,
              h: 0.5,
              fontSize: 18,
              bold: true,
              color: '666666',
              align: 'center'
            }
          );
          
          errorSlide.addText(
            path.basename(file.originalname),
            {
              x: 0.5,
              y: 1.0,
              w: 9.0,
              h: 1.0,
              fontSize: 32,
              bold: true,
              align: 'center'
            }
          );
          
          errorSlide.addText(
            'Failed to load image',
            {
              x: 0.5,
              y: 3.0,
              w: 9.0,
              h: 1.0,
              fontSize: 24,
              color: 'ff0000',
              align: 'center',
              italic: true
            }
          );
          
          errorSlide.addText(
            'This image could not be processed and included in the presentation.',
            {
              x: 1.0,
              y: 4.5,
              w: 8.0,
              h: 1.0,
              fontSize: 16,
              align: 'center',
              color: '999999'
            }
          );
        }
      }
      
      // Save the presentation
      await pptx.writeFile({ fileName: outputPath });
      
      console.log(`PPTX created successfully: ${outputPath}`);
      resolve();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Simple PPTX converter as fallback
async function convertImagesToSimplePPTX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const pptx = new PptxGenJS();
      
      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(
        'Converted Images',
        {
          x: 0.5,
          y: 2.0,
          w: 9.0,
          h: 1.5,
          fontSize: 44,
          bold: true,
          align: 'center'
        }
      );
      
      titleSlide.addText(
        `Total: ${files.length} images`,
        {
          x: 0.5,
          y: 4.0,
          w: 9.0,
          h: 1.0,
          fontSize: 28,
          align: 'center'
        }
      );
      
      // List slide
      const listSlide = pptx.addSlide();
      listSlide.addText(
        'Image List',
        {
          x: 0.5,
          y: 0.5,
          w: 9.0,
          h: 1.0,
          fontSize: 36,
          bold: true
        }
      );
      
      // Add image names as list
      const maxPerSlide = 10;
      let currentSlide = listSlide;
      let slideCount = 1;
      
      for (let i = 0; i < files.length; i++) {
        if (i > 0 && i % maxPerSlide === 0) {
          // Create new slide for more items
          currentSlide = pptx.addSlide();
          currentSlide.addText(
            `Image List (Continued)`,
            {
              x: 0.5,
              y: 0.5,
              w: 9.0,
              h: 1.0,
              fontSize: 36,
              bold: true
            }
          );
          slideCount++;
        }
        
        const yPosition = 1.5 + ((i % maxPerSlide) * 0.6);
        currentSlide.addText(
          `${i + 1}. ${path.basename(files[i].originalname)}`,
          {
            x: 1.0,
            y: yPosition,
            w: 8.0,
            h: 0.5,
            fontSize: 18
          }
        );
        
        currentSlide.addText(
          `Size: ${formatFileSize(files[i].size)}`,
          {
            x: 2.0,
            y: yPosition + 0.3,
            w: 7.0,
            h: 0.3,
            fontSize: 12,
            color: '666666'
          }
        );
      }
      
      // Summary slide
      const summarySlide = pptx.addSlide();
      summarySlide.addText(
        'Summary',
        {
          x: 0.5,
          y: 1.0,
          w: 9.0,
          h: 1.0,
          fontSize: 36,
          bold: true,
          align: 'center'
        }
      );
      
      summarySlide.addText(
        `Total Images: ${files.length}`,
        {
          x: 2.0,
          y: 3.0,
          w: 6.0,
          h: 0.5,
          fontSize: 24
        }
      );
      
      summarySlide.addText(
        `Total Slides: ${slideCount + 2}`,
        {
          x: 2.0,
          y: 4.0,
          w: 6.0,
          h: 0.5,
          fontSize: 24
        }
      );
      
      summarySlide.addText(
        'Generated by EduPulse Image Converter',
        {
          x: 0.5,
          y: 6.5,
          w: 9.0,
          h: 0.5,
          fontSize: 14,
          align: 'center',
          color: '999999'
        }
      );
      
      await pptx.writeFile({ fileName: outputPath });
      
      console.log(`Simple PPTX created: ${outputPath}`);
      resolve();
      
    } catch (error) {
      reject(error);
    }
  });
}

// ===========================
// HELPER FUNCTIONS
// ===========================

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get MIME type for conversion type
function getMimeType(conversionType) {
  const mimeTypes = {
    'pdf': 'application/pdf',
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

// ===========================
// ADDITIONAL ROUTES
// ===========================

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

    console.log('Testing conversion with file:', req.file.path);
    
    // Test all conversion types
    const results = {};
    
    try {
      // Test PDF
      const pdfPath = path.join(tempConvertDir, `test_${Date.now()}.pdf`);
      await convertImagesToPDF([req.file], pdfPath);
      results.pdf = 'Success';
      fs.unlinkSync(pdfPath);
    } catch (error) {
      results.pdf = `Failed: ${error.message}`;
    }
    
    try {
      // Test PPTX
      const pptxPath = path.join(tempConvertDir, `test_${Date.now()}.pptx`);
      await convertImagesToPPTX([req.file], pptxPath);
      results.pptx = 'Success';
      fs.unlinkSync(pptxPath);
    } catch (error) {
      results.pptx = `Failed: ${error.message}`;
    }
    
    // Clean up uploaded file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      success: true,
      results,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Test conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test all conversion types
router.post('/test-all', verifyToken, upload.array('images', 3), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images uploaded'
      });
    }

    const results = [];
    const conversionTypes = ['pdf', 'pptx'];
    
    for (const type of conversionTypes) {
      const testOutputPath = path.join(tempConvertDir, `test_${type}_${Date.now()}.${type}`);
      
      try {
        switch (type) {
          case 'pdf':
            await convertImagesToPDF(req.files, testOutputPath);
            break;
          case 'pptx':
            await convertImagesToPPTX(req.files, testOutputPath);
            break;
        }
        
        if (fs.existsSync(testOutputPath)) {
          const stats = fs.statSync(testOutputPath);
          results.push({
            type,
            success: true,
            size: stats.size,
            formattedSize: formatFileSize(stats.size)
          });
          
          // Clean up test file after 10 seconds
          setTimeout(() => {
            if (fs.existsSync(testOutputPath)) {
              fs.unlinkSync(testOutputPath);
            }
          }, 10000);
        }
      } catch (error) {
        results.push({
          type,
          success: false,
          error: error.message
        });
      }
    }
    
    // Clean up uploaded files
    req.files.forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json({
      success: true,
      message: 'Test completed',
      results
    });
  } catch (error) {
    console.error('Test all conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test setup endpoint
router.get('/test-setup', verifyToken, async (req, res) => {
  try {
    // Check if all required directories exist
    const dirs = ['temp-uploads', 'temp-converted'];
    const dirStatus = {};
    
    dirs.forEach(dir => {
      const dirPath = path.join(__dirname, '..', '..', dir);
      dirStatus[dir] = {
        exists: fs.existsSync(dirPath),
        writable: false
      };
      
      if (dirStatus[dir].exists) {
        try {
          const testFile = path.join(dirPath, 'test.txt');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          dirStatus[dir].writable = true;
        } catch (e) {
          dirStatus[dir].writable = false;
        }
      }
    });
    
    // Check required packages
    const packages = ['pdfkit', 'sharp', 'pdf-lib', 'pptxgenjs'];
    const packageStatus = {};
    
    packages.forEach(pkg => {
      try {
        require.resolve(pkg);
        packageStatus[pkg] = true;
      } catch (e) {
        packageStatus[pkg] = false;
      }
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      directories: dirStatus,
      packages: packageStatus,
      user: req.user.id,
      message: 'Image converter setup test'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;