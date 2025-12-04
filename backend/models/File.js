const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  supabaseId: {
    type: String,
    unique: true
  },
  bucketName: {
    type: String,
    default: 'class-files'
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByName: {
    type: String
  },
  classCode: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isAssignment: {
    type: Boolean,
    default: false
  },
  assignmentTitle: {
    type: String,
    default: 'Assignment'
  },
  assignmentDescription: {
    type: String
  },
  submissionDeadline: {
    type: Date
  },
  submissionCount: {
    type: Number,
    default: 0
  },
  isStudentUpload: {
    type: Boolean,
    default: false
  },
  sharedWithEducator: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('File', fileSchema);