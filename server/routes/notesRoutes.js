const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const authenticateToken = require('../middleware/auth');

// All notes routes require authentication
router.use(authenticateToken);

router.get('/', notesController.getNotes);
router.post('/', notesController.createNote);
router.get('/:id', notesController.getNoteById);
router.put('/:id', notesController.updateNote);
router.delete('/:id', notesController.deleteNote);

module.exports = router;
