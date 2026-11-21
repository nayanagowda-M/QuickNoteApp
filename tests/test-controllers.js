const assert = require('assert');
const authController = require('../server/controllers/authController');
const notesController = require('../server/controllers/notesController');
const db = require('../server/db/database');

// Mock response helper
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

async function runControllerTests() {
  console.log(' Starting Direct Controller & DB Tests...\n');

  const testEmail1 = `alice_${Date.now()}@test.com`;
  const testPassword1 = 'Secret123!';
  let user1Token;
  let user1Id;
  let createdNoteId;

  // Test 1: Register validation - empty fields
  console.log('Test 1: Register validation - empty fields');
  {
    const req = { body: { email: '', password: '', confirmPassword: '' } };
    const res = createMockRes();
    authController.register(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Please fill in all fields'));
    console.log('   Passed: Rejects empty fields');
  }

  // Test 2: Register validation - invalid email
  console.log('Test 2: Register validation - invalid email');
  {
    const req = { body: { email: 'bademail', password: 'password', confirmPassword: 'password' } };
    const res = createMockRes();
    authController.register(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('valid email'));
    console.log('   Passed: Rejects invalid email');
  }

  // Test 3: Register validation - password mismatch
  console.log('Test 3: Register validation - password mismatch');
  {
    const req = { body: { email: 'test@test.com', password: 'passwordA', confirmPassword: 'passwordB' } };
    const res = createMockRes();
    authController.register(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.error.includes('Passwords do not match'));
    console.log('   Passed: Rejects password mismatch');
  }

  // Test 4: Register valid user
  console.log('Test 4: Register valid user');
  {
    const req = { body: { email: testEmail1, password: testPassword1, confirmPassword: testPassword1 } };
    const res = createMockRes();
    authController.register(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, testEmail1);
    user1Token = res.body.token;
    user1Id = res.body.user.id;
    console.log('   Passed: User 1 created with ID:', user1Id);
  }

  // Test 5: Register duplicate email
  console.log('Test 5: Register duplicate email');
  {
    const req = { body: { email: testEmail1, password: testPassword1, confirmPassword: testPassword1 } };
    const res = createMockRes();
    authController.register(req, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.body.error.includes('already exists'));
    console.log('   Passed: Rejects duplicate email');
  }

  // Test 6: Login with wrong password
  console.log('Test 6: Login with wrong password');
  {
    const req = { body: { email: testEmail1, password: 'WrongPassword' } };
    const res = createMockRes();
    authController.login(req, res, () => {});
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body.error.includes('Incorrect email or password'));
    console.log('   Passed: Rejects incorrect password');
  }

  // Test 7: Login with correct password
  console.log('Test 7: Login with correct password');
  {
    const req = { body: { email: testEmail1, password: testPassword1 } };
    const res = createMockRes();
    authController.login(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.email, testEmail1);
    console.log('   Passed: User 1 logged in successfully');
  }

  // Test 8: Get Me
  console.log('Test 8: authController.getMe');
  {
    const req = { user: { id: user1Id, email: testEmail1 } };
    const res = createMockRes();
    authController.getMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.user.email, testEmail1);
    console.log('   Passed: getMe returned user profile');
  }

  // Test 9: Create Note with very long multiline text
  console.log('Test 9: Create Note with very long text');
  const longNoteText = 'Paragraph 1: Testing unlimited length notes.\n\n' +
    'Paragraph 2: Operating systems manage computer hardware and software resources.\n' +
    'Code snippet:\nconst x = 42;\nconsole.log(x);\n\n' +
    'Repeating line: The quick brown fox jumps over the lazy dog. '.repeat(100);

  {
    const req = {
      user: { id: user1Id },
      body: { title: 'OS Comprehensive Lecture Notes', content: longNoteText }
    };
    const res = createMockRes();
    notesController.createNote(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.message, 'Note saved successfully.');
    assert.strictEqual(res.body.note.title, 'OS Comprehensive Lecture Notes');
    assert.strictEqual(res.body.note.content, longNoteText);
    createdNoteId = res.body.note.id;
    console.log('   Passed: Created note with ID:', createdNoteId);
  }

  // Test 10: Create Note with default title when empty
  console.log('Test 10: Create Note with empty title defaults to Untitled Note');
  {
    const req = {
      user: { id: user1Id },
      body: { title: '   ', content: 'Some quick thought' }
    };
    const res = createMockRes();
    notesController.createNote(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.note.title, 'Untitled Note');
    console.log('   Passed: Defaulted title to Untitled Note');
  }

  // Test 11: Get all notes for User 1
  console.log('Test 11: Get all notes for user');
  {
    const req = { user: { id: user1Id }, query: {} };
    const res = createMockRes();
    notesController.getNotes(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.notes.length, 2);
    console.log('   Passed: User 1 has 2 notes');
  }

  // Test 12: Search notes
  console.log('Test 12: Search notes');
  {
    const req = { user: { id: user1Id }, query: { search: 'Comprehensive' } };
    const res = createMockRes();
    notesController.getNotes(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.notes.length, 1);
    assert.strictEqual(res.body.notes[0].id, createdNoteId);
    console.log('   Passed: Search returned matching note');
  }

  // Test 13: Update note
  console.log('Test 13: Update note');
  {
    const req = {
      user: { id: user1Id },
      params: { id: createdNoteId },
      body: { title: 'OS Comprehensive Lecture Notes (Revised)', content: longNoteText + '\n\nAdded Revision notes.' }
    };
    const res = createMockRes();
    notesController.updateNote(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.message, 'Note updated successfully.');
    assert.strictEqual(res.body.note.title, 'OS Comprehensive Lecture Notes (Revised)');
    console.log('   Passed: Note updated successfully');
  }

  // Test 14: Data isolation between users
  console.log('Test 14: Strict data isolation for User 2');
  let user2Id;
  {
    // Register User 2
    const testEmail2 = `bob_${Date.now()}@test.com`;
    const regReq = { body: { email: testEmail2, password: 'Password999!', confirmPassword: 'Password999!' } };
    const regRes = createMockRes();
    authController.register(regReq, regRes, () => {});
    user2Id = regRes.body.user.id;

    // User 2 lists notes -> empty
    const listReq = { user: { id: user2Id }, query: {} };
    const listRes = createMockRes();
    notesController.getNotes(listReq, listRes, () => {});
    assert.strictEqual(listRes.body.notes.length, 0);

    // User 2 cannot get User 1's note
    const getReq = { user: { id: user2Id }, params: { id: createdNoteId } };
    const getRes = createMockRes();
    notesController.getNoteById(getReq, getRes, () => {});
    assert.strictEqual(getRes.statusCode, 404);

    // User 2 cannot update User 1's note
    const updateReq = { user: { id: user2Id }, params: { id: createdNoteId }, body: { title: 'Hacked', content: 'Hacked' } };
    const updateRes = createMockRes();
    notesController.updateNote(updateReq, updateRes, () => {});
    assert.strictEqual(updateRes.statusCode, 404);

    // User 2 cannot delete User 1's note
    const delReq = { user: { id: user2Id }, params: { id: createdNoteId } };
    const delRes = createMockRes();
    notesController.deleteNote(delReq, delRes, () => {});
    assert.strictEqual(delRes.statusCode, 404);

    console.log('   Passed: User 2 cannot see, read, edit or delete User 1 notes');
  }

  // Test 15: Delete note by Owner
  console.log('Test 15: Delete note by Owner');
  {
    const delReq = { user: { id: user1Id }, params: { id: createdNoteId } };
    const delRes = createMockRes();
    notesController.deleteNote(delReq, delRes, () => {});
    assert.strictEqual(delRes.statusCode, 200);
    assert.strictEqual(delRes.body.message, 'Note deleted successfully.');
    assert.strictEqual(delRes.body.deletedId, createdNoteId);

    // Verify it is gone
    const getReq = { user: { id: user1Id }, params: { id: createdNoteId } };
    const getRes = createMockRes();
    notesController.getNoteById(getReq, getRes, () => {});
    assert.strictEqual(getRes.statusCode, 404);
    console.log('   Passed: Note deleted and no longer exists');
  }

  console.log('\n ALL 15 BACKEND TESTS PASSED FLAWLESSLY! \n');
}

runControllerTests().catch(err => {
  console.error(' Test failed:', err);
  process.exit(1);
});
