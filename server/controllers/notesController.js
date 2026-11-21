const db = require('../db/database');

/**
 * GET /api/notes
 * Retrieve all notes belonging to the logged-in user, sorted latest updated first
 */
exports.getNotes = (req, res, next) => {
  try {
    const userId = req.user.id;
    const search = req.query.search ? req.query.search.trim() : '';

    let notes;
    if (search) {
      const stmt = db.prepare(`
        SELECT id, user_id, title, content, created_at, updated_at
        FROM notes
        WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)
        ORDER BY updated_at DESC, id DESC
      `);
      const searchPattern = `%${search}%`;
      notes = stmt.all(userId, searchPattern, searchPattern);
    } else {
      const stmt = db.prepare(`
        SELECT id, user_id, title, content, created_at, updated_at
        FROM notes
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
      `);
      notes = stmt.all(userId);
    }

    return res.status(200).json({ notes });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notes/:id
 * Retrieve a single note by ID (only if owned by current user)
 */
exports.getNoteById = (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const userId = req.user.id;

    if (!noteId || isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }

    const stmt = db.prepare(`
      SELECT id, user_id, title, content, created_at, updated_at
      FROM notes
      WHERE id = ? AND user_id = ?
    `);
    const note = stmt.get(noteId, userId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    return res.status(200).json({ note });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notes
 * Create and save a new note
 */
exports.createNote = (req, res, next) => {
  try {
    const userId = req.user.id;
    let { title, content } = req.body;

    // Default title if empty
    title = (typeof title === 'string' && title.trim()) ? title.trim() : 'Untitled Note';
    content = typeof content === 'string' ? content : '';
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO notes (user_id, title, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(userId, title, content, now, now);
    const noteId = Number(result.lastInsertRowid);

    // Retrieve created note
    const getStmt = db.prepare(`
      SELECT id, user_id, title, content, created_at, updated_at
      FROM notes
      WHERE id = ?
    `);
    const createdNote = getStmt.get(noteId);

    return res.status(201).json({
      message: 'Note saved successfully.',
      note: createdNote
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notes/:id
 * Update an existing note
 */
exports.updateNote = (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const userId = req.user.id;
    let { title, content } = req.body;

    if (!noteId || isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }

    // Verify ownership
    const checkStmt = db.prepare(`
      SELECT id FROM notes WHERE id = ? AND user_id = ?
    `);
    const existing = checkStmt.get(noteId, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found or you do not have permission to edit it.' });
    }

    title = (typeof title === 'string' && title.trim()) ? title.trim() : 'Untitled Note';
    content = typeof content === 'string' ? content : '';
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE notes
      SET title = ?, content = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `);
    updateStmt.run(title, content, now, noteId, userId);

    // Retrieve updated note
    const getStmt = db.prepare(`
      SELECT id, user_id, title, content, created_at, updated_at
      FROM notes
      WHERE id = ?
    `);
    const updatedNote = getStmt.get(noteId);

    return res.status(200).json({
      message: 'Note updated successfully.',
      note: updatedNote
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/notes/:id
 * Delete an existing note
 */
exports.deleteNote = (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const userId = req.user.id;

    if (!noteId || isNaN(noteId)) {
      return res.status(400).json({ error: 'Invalid note ID.' });
    }

    // Verify ownership
    const checkStmt = db.prepare(`
      SELECT id FROM notes WHERE id = ? AND user_id = ?
    `);
    const existing = checkStmt.get(noteId, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Note not found or you do not have permission to delete it.' });
    }

    const deleteStmt = db.prepare(`
      DELETE FROM notes WHERE id = ? AND user_id = ?
    `);
    deleteStmt.run(noteId, userId);

    return res.status(200).json({
      message: 'Note deleted successfully.',
      deletedId: noteId
    });
  } catch (err) {
    next(err);
  }
};
