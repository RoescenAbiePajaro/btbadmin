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
const officegen = require('officegen');
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
      user: req.user.id
    });

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
        await processConversion(conversion._id, req.files, conversionType, classCode, user);
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
async function processConversion(conversionId, files, conversionType, classCode, user) {
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
    switch (conversionType) {
      case 'pdf':
        result = await convertImagesToPDF(files, outputFilePath);
        break;
      case 'docx':
        result = await convertImagesToDOCX(files, outputFilePath);
        break;
      case 'pptx':
        result = await convertImagesToPPTX(files, outputFilePath);
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

      for (const file of files) {
        try {
          doc.addPage();
          
          const imageInfo = await sharp(file.path).metadata();
          const pageWidth = doc.page.width - 100;
          const pageHeight = doc.page.height - 100;
          
          let width = imageInfo.width;
          let height = imageInfo.height;
          
          const widthRatio = pageWidth / width;
          const heightRatio = pageHeight / height;
          const scale = Math.min(widthRatio, heightRatio, 1);
          
          width *= scale;
          height *= scale;
          
          const x = (doc.page.width - width) / 2;
          const y = (doc.page.height - height) / 2;
          
          doc.image(file.path, x, y, {
            width: width,
            height: height,
            fit: [width, height],
            align: 'center',
            valign: 'center'
          });
          
          doc.moveDown();
          doc.fontSize(10);
          doc.text(path.basename(file.originalname), {
            align: 'center',
            width: doc.page.width - 100
          });
          
        } catch (imageError) {
          console.warn(`Error processing image ${file.originalname}:`, imageError.message);
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

// Convert images to DOCX using officegen
async function convertImagesToDOCX(files, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const docx = officegen('docx');
      
      docx.on('finalize', function(written) {
        console.log(`DOCX created successfully: ${outputPath}, size: ${written} bytes`);
        resolve();
      });
      
      docx.on('error', function(err) {
        reject(err);
      });
      
      const output = fs.createWriteStream(outputPath);
      docx.generate(output);
      
      const pObj = docx.createP();
      pObj.addText('Converted Images Document', { 
        font_size: 24, 
        bold: true, 
        align: 'center' 
      });
      
      const pMeta = docx.createP();
      pMeta.addText(`Total images: ${files.length}`, { font_size: 12 });
      
      files.forEach((file, index) => {
        if (index > 0) {
          docx.createPageBreak();
        }
        
        const pTitle = docx.createP();
        pTitle.addText(`Image ${index + 1}: ${path.basename(file.originalname)}`, { 
          font_size: 14, 
          bold: true 
        });
        
        try {
          const imageBuffer = fs.readFileSync(file.path);
          docx.createImage({
            path: file.path,
            cx: 400, 
            cy: 300, 
          });
          
          const pInfo = docx.createP();
          pInfo.addText(`Size: ${formatFileSize(file.size)} | Position: ${index + 1}/${files.length}`, {
            font_size: 10,
            color: '666666'
          });
          
        } catch (imageError) {
          console.warn(`Error adding image to DOCX: ${imageError.message}`);
          
          const pError = docx.createP();
          pError.addText(`[Image ${index + 1}: ${path.basename(file.originalname)} - Failed to load]`, {
            font_size: 12,
            color: 'ff0000',
            italics: true
          });
        }
      });
      
      output.on('finish', function() {
        console.log('DOCX generation complete');
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Convert images to PPTX using pptxgenjs
async function convertImagesToPPTX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const pptx = new PptxGenJS();
      
      pptx.title = 'Converted Images Presentation';
      pptx.author = 'EduPulse Image Converter';
      pptx.company = 'EduPulse';
      
      pptx.layout = 'LAYOUT_WIDE';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const slide = pptx.addSlide();
          
          slide.addText(`Slide ${i + 1}: ${path.basename(file.originalname)}`, {
            x: 1.0,
            y: 0.5,
            w: 8.0,
            h: 1.0,
            fontSize: 24,
            bold: true,
            align: 'center'
          });
          
          const imageBuffer = fs.readFileSync(file.path);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = file.mimetype;
          
          let imageExt = 'png';
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) imageExt = 'jpeg';
          else if (mimeType.includes('png')) imageExt = 'png';
          else if (mimeType.includes('gif')) imageExt = 'gif';
          
          slide.addImage({
            data: `data:${mimeType};base64,${base64Image}`,
            x: 1.0,
            y: 2.0,
            w: 8.0,
            h: 4.5,
            sizing: { type: 'contain', w: 8.0, h: 4.5 }
          });
          
          slide.addText(
            `Image ${i + 1} of ${files.length} | Size: ${formatFileSize(file.size)}`,
            {
              x: 1.0,
              y: 6.8,
              w: 8.0,
              h: 0.5,
              fontSize: 12,
              color: '666666',
              align: 'center'
            }
          );
          
        } catch (imageError) {
          console.warn(`Error processing image for PPTX: ${imageError.message}`);
          
          const errorSlide = pptx.addSlide();
          errorSlide.addText(
            `Slide ${i + 1}: ${path.basename(file.originalname)}`,
            {
              x: 1.0,
              y: 1.0,
              w: 8.0,
              h: 1.0,
              fontSize: 24,
              bold: true,
              align: 'center'
            }
          );
          
          errorSlide.addText(
            'Failed to load image',
            {
              x: 1.0,
              y: 3.0,
              w: 8.0,
              h: 1.0,
              fontSize: 18,
              color: 'ff0000',
              align: 'center'
            }
          );
        }
      }
      
      const titleSlide = pptx.addSlide();
      titleSlide.addText(
        'Converted Images Presentation',
        {
          x: 1.0,
          y: 2.0,
          w: 8.0,
          h: 1.5,
          fontSize: 36,
          bold: true,
          align: 'center'
        }
      );
      
      titleSlide.addText(
        `Total Images: ${files.length}`,
        {
          x: 1.0,
          y: 4.0,
          w: 8.0,
          h: 1.0,
          fontSize: 24,
          align: 'center',
          color: '666666'
        }
      );
      
      await pptx.writeFile({ fileName: outputPath });
      
      console.log(`PPTX created successfully: ${outputPath}`);
      resolve();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Fallback function for DOCX (simpler version using officegen)
async function convertImagesToSimpleDOCX(files, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const docx = officegen('docx');
      
      docx.on('finalize', function(written) {
        console.log(`Simple DOCX created: ${outputPath}, size: ${written} bytes`);
        resolve();
      });
      
      docx.on('error', function(err) {
        reject(err);
      });
      
      const output = fs.createWriteStream(outputPath);
      docx.generate(output);
      
      const pTitle = docx.createP();
      pTitle.addText('Converted Images', { font_size: 20, bold: true, align: 'center' });
      
      files.forEach((file, index) => {
        const p = docx.createP();
        p.addText(`${index + 1}. ${path.basename(file.originalname)}`, { font_size: 12 });
        
        const pInfo = docx.createP({ indent: 0.5 });
        pInfo.addText(`Size: ${formatFileSize(file.size)}`, { font_size: 10, color: '666666' });
      });
      
      output.on('finish', function() {
        console.log('Simple DOCX generation complete');
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Fallback function for PPTX (simpler version using pptxgenjs)
async function convertImagesToSimplePPTX(files, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const pptx = new PptxGenJS();
      
      const titleSlide = pptx.addSlide();
      titleSlide.addText(
        'Converted Images',
        {
          x: 1.0,
          y: 2.0,
          w: 8.0,
          h: 1.5,
          fontSize: 36,
          bold: true,
          align: 'center'
        }
      );
      
      titleSlide.addText(
        `Total: ${files.length} images`,
        {
          x: 1.0,
          y: 4.0,
          w: 8.0,
          h: 1.0,
          fontSize: 24,
          align: 'center'
        }
      );
      
      const listSlide = pptx.addSlide();
      listSlide.addText(
        'Image List',
        {
          x: 1.0,
          y: 0.5,
          w: 8.0,
          h: 1.0,
          fontSize: 28,
          bold: true
        }
      );
      
      files.forEach((file, index) => {
        listSlide.addText(
          `${index + 1}. ${path.basename(file.originalname)}`,
          {
            x: 1.5,
            y: 1.5 + (index * 0.5),
            w: 7.0,
            h: 0.4,
            fontSize: 14
          }
        );
      });
      
      await pptx.writeFile({ fileName: outputPath });
      
      console.log(`Simple PPTX created: ${outputPath}`);
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
    const packages = ['pdfkit', 'sharp', 'pdf-lib', 'officegen', 'pptxgenjs'];
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