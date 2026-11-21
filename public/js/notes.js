/**
 * Notes State & UI Manager
 * Handles listing, viewing, creating, updating, deleting, and searching notes
 */

import { NotesAPI } from './api.js';

// Format timestamp into clean relative time (e.g. "Updated 2 minutes ago")
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return 'Just now';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }

  // Format date: Nov 21, 2026
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Toast notification helper
export function showToast(message, type = 'success', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, duration);
}

export const Notes = {
  notesList: [],
  activeNoteId: null,
  searchQuery: '',
  isSaving: false,
  noteToDeleteId: null,

  // DOM Elements
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
  },

  cacheElements() {
    this.elements = {
      workspace: document.getElementById('notes-workspace'),
      sidebar: document.getElementById('notes-sidebar'),
      listContainer: document.getElementById('notes-list-container'),
      emptyState: document.getElementById('empty-list-state'),
      searchInput: document.getElementById('search-notes-input'),
      clearSearchBtn: document.getElementById('clear-search-btn'),
      notesCounter: document.getElementById('notes-counter'),
      newNoteBtnSidebar: document.getElementById('new-note-btn-sidebar'),
      newNoteBtnEditor: document.getElementById('new-note-btn-editor'),
      saveNoteBtn: document.getElementById('save-note-btn'),
      saveBtnText: document.getElementById('save-btn-text'),
      deleteNoteBtn: document.getElementById('delete-note-btn'),
      mobileBackBtn: document.getElementById('mobile-back-btn'),
      titleInput: document.getElementById('note-title-input'),
      contentInput: document.getElementById('note-content-input'),
      timeInfo: document.getElementById('note-time-info'),
      wordCount: document.getElementById('word-count'),
      charCount: document.getElementById('char-count'),
      editorStatus: document.getElementById('editor-status'),
      editorStatusText: document.getElementById('editor-status-text'),
      deleteModal: document.getElementById('delete-modal'),
      cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
      confirmDeleteBtn: document.getElementById('confirm-delete-btn')
    };
  },

  bindEvents() {
    // New Note buttons
    this.elements.newNoteBtnSidebar.addEventListener('click', () => this.startNewNote());
    this.elements.newNoteBtnEditor.addEventListener('click', () => this.startNewNote());

    // Save Note button
    this.elements.saveNoteBtn.addEventListener('click', () => this.saveNote());

    // Delete Note button
    this.elements.deleteNoteBtn.addEventListener('click', () => this.openDeleteModal());
    this.elements.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
    this.elements.confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

    // Close modal on escape or backdrop click
    this.elements.deleteModal.addEventListener('click', (e) => {
      if (e.target === this.elements.deleteModal) this.closeDeleteModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.deleteModal.classList.contains('hidden')) {
        this.closeDeleteModal();
      }
      // Ctrl+S or Cmd+S to save note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        const notesScreen = document.getElementById('notes-screen');
        if (notesScreen && !notesScreen.classList.contains('hidden')) {
          e.preventDefault();
          this.saveNote();
        }
      }
    });

    // Mobile Back button
    this.elements.mobileBackBtn.addEventListener('click', () => {
      this.elements.workspace.classList.remove('mobile-show-editor');
    });

    // Search input
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      if (this.searchQuery) {
        this.elements.clearSearchBtn.classList.remove('hidden');
      } else {
        this.elements.clearSearchBtn.classList.add('hidden');
      }
      this.renderNotesList();
    });

    this.elements.clearSearchBtn.addEventListener('click', () => {
      this.elements.searchInput.value = '';
      this.searchQuery = '';
      this.elements.clearSearchBtn.classList.add('hidden');
      this.elements.searchInput.focus();
      this.renderNotesList();
    });

    // Live counter and status tracking on text inputs
    this.elements.titleInput.addEventListener('input', () => {
      this.markUnsaved();
    });

    this.elements.contentInput.addEventListener('input', () => {
      this.updateStats();
      this.markUnsaved();
    });
  },

  // Load all notes from backend
  async loadNotes() {
    try {
      const data = await NotesAPI.getNotes();
      this.notesList = Array.isArray(data.notes) ? data.notes : [];
      this.renderNotesList();

      if (this.notesList.length > 0) {
        // Automatically select the first note
        this.selectNote(this.notesList[0].id);
      } else {
        this.startNewNote();
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      showToast('Could not load notes from server.', 'error');
    }
  },

  // Filter notes based on live search query
  getFilteredNotes() {
    if (!this.searchQuery.trim()) {
      return this.notesList;
    }
    const q = this.searchQuery.toLowerCase();
    return this.notesList.filter(note => {
      const titleMatch = note.title && note.title.toLowerCase().includes(q);
      const contentMatch = note.content && note.content.toLowerCase().includes(q);
      return titleMatch || contentMatch;
    });
  },

  // Render the left-hand list of saved notes
  renderNotesList() {
    const filtered = this.getFilteredNotes();

    // Update count indicator
    const totalCount = this.notesList.length;
    if (this.searchQuery.trim()) {
      this.elements.notesCounter.textContent = `${filtered.length} of ${totalCount} note${totalCount === 1 ? '' : 's'}`;
    } else {
      this.elements.notesCounter.textContent = `${totalCount} note${totalCount === 1 ? '' : 's'}`;
    }

    // Clear previous items
    this.elements.listContainer.innerHTML = '';

    if (filtered.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-list-state';

      if (this.searchQuery.trim()) {
        emptyDiv.innerHTML = `
          <div class="empty-icon">🔍</div>
          <h3>No notes found</h3>
          <p>No results matching "${this.escapeHtml(this.searchQuery)}"</p>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="empty-icon">📝</div>
          <h3>No notes yet</h3>
          <p>Click <strong>+ New Note</strong> to start writing!</p>
        `;
      }
      this.elements.listContainer.appendChild(emptyDiv);
      return;
    }

    filtered.forEach(note => {
      const item = document.createElement('div');
      item.className = `note-item ${note.id === this.activeNoteId ? 'active' : ''}`;
      item.dataset.id = note.id;

      // Extract a clean preview snippet
      const cleanContent = (note.content || '').replace(/\s+/g, ' ').trim();
      const previewText = cleanContent || 'No additional text';
      const relativeTime = formatRelativeTime(note.updated_at || note.created_at);

      item.innerHTML = `
        <div class="note-item-header">
          <h4 class="note-item-title">${this.escapeHtml(note.title || 'Untitled Note')}</h4>
        </div>
        <p class="note-item-preview">${this.escapeHtml(previewText)}</p>
        <div class="note-item-date">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Updated ${this.escapeHtml(relativeTime)}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectNote(note.id);
      });

      this.elements.listContainer.appendChild(item);
    });
  },

  // Select an existing note and populate editor
  selectNote(id) {
    const note = this.notesList.find(n => n.id === id);
    if (!note) return;

    this.activeNoteId = note.id;

    // Populate editor fields
    this.elements.titleInput.value = note.title || '';
    this.elements.contentInput.value = note.content || '';

    // Update metadata
    const relativeTime = formatRelativeTime(note.updated_at || note.created_at);
    this.elements.timeInfo.textContent = `Last updated ${relativeTime}`;

    // Show delete button for existing note
    this.elements.deleteNoteBtn.classList.remove('hidden');
    this.elements.saveBtnText.textContent = 'Save Changes';

    this.markSaved();
    this.updateStats();

    // Update active highlight in list
    this.highlightActiveInList();

    // Switch to editor view on mobile
    this.elements.workspace.classList.add('mobile-show-editor');
  },

  // Reset editor for a new note
  startNewNote() {
    this.activeNoteId = null;
    this.elements.titleInput.value = '';
    this.elements.contentInput.value = '';
    this.elements.timeInfo.textContent = 'New unsaved note';

    // Hide delete button for fresh drafts
    this.elements.deleteNoteBtn.classList.add('hidden');
    this.elements.saveBtnText.textContent = 'Save Note';

    this.markDraft();
    this.updateStats();

    this.highlightActiveInList();

    // Switch to editor view on mobile
    this.elements.workspace.classList.add('mobile-show-editor');

    // Focus title input
    this.elements.titleInput.focus();
  },

  // Save current note (create or update)
  async saveNote() {
    if (this.isSaving) return;

    const rawTitle = this.elements.titleInput.value.trim();
    const title = rawTitle || 'Untitled Note';
    const content = this.elements.contentInput.value;

    this.isSaving = true;
    this.elements.saveNoteBtn.disabled = true;
    const originalText = this.elements.saveBtnText.textContent;
    this.elements.saveBtnText.textContent = 'Saving...';

    try {
      if (this.activeNoteId === null) {
        // Create new note: POST /api/notes
        const res = await NotesAPI.createNote(title, content);
        const newNote = res.note;

        // Insert at the beginning of notesList (latest updated)
        this.notesList.unshift(newNote);
        this.activeNoteId = newNote.id;

        // Update UI
        this.elements.deleteNoteBtn.classList.remove('hidden');
        this.elements.saveBtnText.textContent = 'Save Changes';
        this.elements.timeInfo.textContent = 'Last updated Just now';

        showToast(res.message || 'Note saved successfully.', 'success');
      } else {
        // Update existing note: PUT /api/notes/:id
        const res = await NotesAPI.updateNote(this.activeNoteId, title, content);
        const updatedNote = res.note;

        // Update item in notesList and move to top
        const index = this.notesList.findIndex(n => n.id === this.activeNoteId);
        if (index !== -1) {
          this.notesList.splice(index, 1);
        }
        this.notesList.unshift(updatedNote);

        this.elements.timeInfo.textContent = 'Last updated Just now';
        showToast(res.message || 'Note updated successfully.', 'success');
      }

      this.markSaved();
      this.renderNotesList();
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      this.isSaving = false;
      this.elements.saveNoteBtn.disabled = false;
      if (this.activeNoteId) {
        this.elements.saveBtnText.textContent = 'Save Changes';
      } else {
        this.elements.saveBtnText.textContent = originalText;
      }
    }
  },

  // Delete modal management
  openDeleteModal() {
    if (!this.activeNoteId) return;
    this.noteToDeleteId = this.activeNoteId;
    this.elements.deleteModal.classList.remove('hidden');
  },

  closeDeleteModal() {
    this.noteToDeleteId = null;
    this.elements.deleteModal.classList.add('hidden');
  },

  async confirmDelete() {
    if (!this.noteToDeleteId) return;
    const idToDelete = this.noteToDeleteId;
    this.closeDeleteModal();

    try {
      const res = await NotesAPI.deleteNote(idToDelete);

      // Remove from state list immediately
      this.notesList = this.notesList.filter(n => n.id !== idToDelete);

      showToast(res.message || 'Note deleted successfully.', 'success');

      // Update UI: select next note or start new note
      if (this.notesList.length > 0) {
        this.selectNote(this.notesList[0].id);
      } else {
        this.startNewNote();
      }

      this.renderNotesList();
    } catch (err) {
      console.error('Failed to delete note:', err);
      showToast(err.message || 'Failed to delete note.', 'error');
    }
  },

  // Word and character count calculation
  updateStats() {
    const text = this.elements.contentInput.value || '';
    const charLength = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    this.elements.wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
    this.elements.charCount.textContent = `${charLength} character${charLength === 1 ? '' : 's'}`;
  },

  // Status badge states
  markSaved() {
    this.elements.editorStatus.className = 'editor-status saved';
    this.elements.editorStatusText.textContent = 'Saved';
  },

  markUnsaved() {
    this.elements.editorStatus.className = 'editor-status unsaved';
    this.elements.editorStatusText.textContent = 'Unsaved changes';
  },

  markDraft() {
    this.elements.editorStatus.className = 'editor-status';
    this.elements.editorStatusText.textContent = 'Draft';
  },

  // Highlight active note item in list
  highlightActiveInList() {
    const items = this.elements.listContainer.querySelectorAll('.note-item');
    items.forEach(el => {
      if (Number(el.dataset.id) === this.activeNoteId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
