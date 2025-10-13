// /routes/accessCodes.js
const express = require('express');
const router = express.Router();
const AccessCode = require('../models/AccessCode');
const { verifyToken } = require('../middleware/auth');

// -------------------------
// 🟩 Public Endpoints
// -------------------------

// Validate an access code
router.get('/validate/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const accessCode = await AccessCode.findOne({ code });

    if (!accessCode) {
      return res.status(404).json({ valid: false, message: 'Invalid access code' });
    }

    if (!accessCode.isActive) {
      return res.status(400).json({ valid: false, message: 'This access code is no longer active' });
    }

    if (accessCode.currentUses >= accessCode.maxUses) {
      return res.status(400).json({ valid: false, message: 'This access code has reached its maximum usage limit' });
    }

    res.json({
      valid: true,
      message: 'Access code is valid',
      code: accessCode.code,
      description: accessCode.description
    });
  } catch (error) {
    console.error('Error validating access code:', error);
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// Increment usage (public)
router.post('/use/:code', async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const accessCode = await AccessCode.findOne({ code });

    if (!accessCode) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    if (!accessCode.isActive) {
      return res.status(400).json({ success: false, message: 'This access code is inactive' });
    }

    if (accessCode.currentUses >= accessCode.maxUses) {
      return res.status(400).json({ success: false, message: 'This access code has reached its maximum usage limit' });
    }

    accessCode.currentUses += 1;
    await accessCode.save();

    res.json({
      success: true,
      message: 'Access code used successfully',
      remainingUses: accessCode.maxUses - accessCode.currentUses
    });
  } catch (error) {
    console.error('Error using access code:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// -------------------------
// 🟦 Protected Endpoints
// -------------------------

// Get all access codes
router.get('/', verifyToken, async (req, res) => {
  try {
    const accessCodes = await AccessCode.find().sort({ createdAt: -1 });
    res.json(accessCodes);
  } catch (error) {
    console.error('Error fetching access codes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new access code
router.post('/', verifyToken, async (req, res) => {
  try {
    const { code, description, maxUses, isActive } = req.body;

    const formattedCode = code.trim().toUpperCase();

    const existing = await AccessCode.findOne({ code: formattedCode });
    if (existing) {
      return res.status(400).json({ message: 'Access code already exists' });
    }

    const newCode = new AccessCode({
      code: formattedCode,
      description: description || '',
      maxUses: Math.max(1, parseInt(maxUses) || 1),
      isActive: isActive !== false,
      currentUses: 0
    });

    const saved = await newCode.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating access code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an access code
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { code, description, maxUses, isActive } = req.body;
    const updateData = {
      description: description || '',
      maxUses: Math.max(1, parseInt(maxUses) || 1),
      isActive: isActive !== false
    };

    if (code) {
      updateData.code = code.trim().toUpperCase();
      const existing = await AccessCode.findOne({
        code: updateData.code,
        _id: { $ne: req.params.id }
      });
      if (existing) {
        return res.status(400).json({ message: 'Access code already exists' });
      }
    }

    const updated = await AccessCode.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: 'Access code not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating access code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an access code
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await AccessCode.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Access code not found' });
    }
    res.json({ message: 'Access code deleted successfully' });
  } catch (error) {
    console.error('Error deleting access code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
