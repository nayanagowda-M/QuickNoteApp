const assert = require('assert');
const http = require('http');
const app = require('../server/index');

let server;
let PORT;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: PORT, host: '127.0.0.1', ...options }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log(' Starting API automated tests...\n');

  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => {
      PORT = server.address().port;
      console.log(` Test server listening on 127.0.0.1:${PORT}`);
      resolve();
    });
    server.on('error', reject);
  });

  try {
    const testEmail1 = `user1_${Date.now()}@test.com`;
    const testPass1 = 'Password123!';
    let token1;
    let note1Id;

    // Test 1: Register validation - empty fields
    console.log('Test 1: Validation - empty fields');
    const resEmpty = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: '', password: '', confirmPassword: '' });
    assert.strictEqual(resEmpty.status, 400);
    assert.ok(resEmpty.body.error.includes('Please fill in all fields'));
    console.log('   Passed: Rejects empty fields');

    // Test 2: Register validation - invalid email
    console.log('Test 2: Validation - invalid email');
    const resInvalidEmail = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'not-an-email', password: 'password123', confirmPassword: 'password123' });
    assert.strictEqual(resInvalidEmail.status, 400);
    assert.ok(resInvalidEmail.body.error.includes('valid email'));
    console.log('   Passed: Rejects invalid email');

    // Test 3: Register validation - password mismatch
    console.log('Test 3: Validation - password mismatch');
    const resMismatch = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'user@test.com', password: 'password123', confirmPassword: 'differentpassword' });
    assert.strictEqual(resMismatch.status, 400);
    assert.ok(resMismatch.body.error.includes('Passwords do not match'));
    console.log('   Passed: Rejects password mismatch');

    // Test 4: Register valid user 1
    console.log('Test 4: Register valid User 1');
    const resReg1 = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail1, password: testPass1, confirmPassword: testPass1 });
    assert.strictEqual(resReg1.status, 201);
    assert.ok(resReg1.body.token);
    assert.strictEqual(resReg1.body.user.email, testEmail1);
    token1 = resReg1.body.token;
    console.log('   Passed: User 1 registered with token');

    // Test 5: Reject duplicate email
    console.log('Test 5: Reject duplicate registration');
    const resDup = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail1, password: testPass1, confirmPassword: testPass1 });
    assert.strictEqual(resDup.status, 409);
    assert.ok(resDup.body.error.includes('already exists'));
    console.log('   Passed: Duplicate email rejected');

    // Test 6: Login with wrong password
    console.log('Test 6: Reject login with wrong password');
    const resWrongLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail1, password: 'WrongPassword!' });
    assert.strictEqual(resWrongLogin.status, 401);
    assert.ok(resWrongLogin.body.error.includes('Incorrect email or password'));
    console.log('   Passed: Login with wrong password rejected');

    // Test 7: Login with correct password
    console.log('Test 7: Login with correct password');
    const resLogin = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail1, password: testPass1 });
    assert.strictEqual(resLogin.status, 200);
    assert.ok(resLogin.body.token);
    assert.strictEqual(resLogin.body.user.email, testEmail1);
    console.log('   Passed: User 1 logged in successfully');

    // Test 8: Get /api/auth/me
    console.log('Test 8: Authenticated /api/auth/me');
    const resMe = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(resMe.status, 200);
    assert.strictEqual(resMe.body.user.email, testEmail1);
    console.log('   Passed: /api/auth/me verified user identity');

    // Test 9: Unauthenticated request rejected
    console.log('Test 9: Reject unauthenticated request to /api/notes');
    const resUnauth = await request({
      path: '/api/notes',
      method: 'GET'
    });
    assert.strictEqual(resUnauth.status, 401);
    console.log('   Passed: Protected route rejects missing token');

    // Test 10: Create a very long note for User 1
    console.log('Test 10: Create very long note');
    const longContent = `
# Operating System Notes

## 1. Process Management
A process is a program in execution. It includes the program counter, registers, and variables.
Threads are lightweight processes within the same address space.

## 2. Memory Management
Virtual memory allows the execution of processes that are not completely in memory.
Paging and segmentation are key techniques used to avoid external fragmentation.

## 3. Code Example:
\`\`\`c
#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        printf("Child process\\n");
    } else {
        printf("Parent process\\n");
    }
    return 0;
}
\`\`\`

` + 'Very long detailed study text paragraph repeating to verify unlimited capacity... '.repeat(50);

    const resCreateNote = await request({
      path: '/api/notes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      title: 'Operating System Notes',
      content: longContent
    });
    assert.strictEqual(resCreateNote.status, 201);
    assert.strictEqual(resCreateNote.body.message, 'Note saved successfully.');
    assert.strictEqual(resCreateNote.body.note.title, 'Operating System Notes');
    assert.strictEqual(resCreateNote.body.note.content, longContent);
    note1Id = resCreateNote.body.note.id;
    console.log('   Passed: Long note created successfully with ID:', note1Id);

    // Test 11: Create a second note for User 1
    console.log('Test 11: Create second note for User 1');
    const resCreateNote2 = await request({
      path: '/api/notes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      title: 'Project Ideas',
      content: '1. Full Stack Notes App\n2. Real-time chat\n3. Markdown documentation builder'
    });
    assert.strictEqual(resCreateNote2.status, 201);
    const note2Id = resCreateNote2.body.note.id;
    console.log('   Passed: Second note created with ID:', note2Id);

    // Test 12: Get all notes for User 1 (sorted latest first)
    console.log('Test 12: List all notes for User 1');
    const resListNotes = await request({
      path: '/api/notes',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(resListNotes.status, 200);
    assert.strictEqual(resListNotes.body.notes.length, 2);
    assert.strictEqual(resListNotes.body.notes[0].id, note2Id); // latest first
    console.log('   Passed: Retrieved 2 notes in correct descending order');

    // Test 13: Update note
    console.log('Test 13: Update Note 1');
    const updatedContent = longContent + '\n\nUpdated: Added section on Concurrency and Semaphores.';
    const resUpdate = await request({
      path: `/api/notes/${note1Id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      }
    }, {
      title: 'Operating System Notes (Advanced)',
      content: updatedContent
    });
    assert.strictEqual(resUpdate.status, 200);
    assert.strictEqual(resUpdate.body.message, 'Note updated successfully.');
    assert.strictEqual(resUpdate.body.note.title, 'Operating System Notes (Advanced)');
    assert.strictEqual(resUpdate.body.note.content, updatedContent);
    console.log('   Passed: Note updated successfully');

    // Test 14: Strict User Isolation / Privacy Check with User 2
    console.log('Test 14: Strict multi-user data isolation test');
    const testEmail2 = `user2_${Date.now()}@test.com`;
    const resReg2 = await request({
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail2, password: 'Password456!', confirmPassword: 'Password456!' });
    assert.strictEqual(resReg2.status, 201);
    const token2 = resReg2.body.token;

    // User 2 lists notes -> should be empty
    const resUser2Notes = await request({
      path: '/api/notes',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert.strictEqual(resUser2Notes.status, 200);
    assert.strictEqual(resUser2Notes.body.notes.length, 0);
    console.log('   Passed: User 2 sees 0 notes (cannot see User 1 notes)');

    // User 2 attempts to GET User 1's note
    const resUser2GetOther = await request({
      path: `/api/notes/${note1Id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert.strictEqual(resUser2GetOther.status, 404);
    console.log('   Passed: User 2 cannot access User 1 note');

    // User 2 attempts to UPDATE User 1's note
    const resUser2UpdateOther = await request({
      path: `/api/notes/${note1Id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token2}`
      }
    }, { title: 'Hacked Title', content: 'Hacked Content' });
    assert.strictEqual(resUser2UpdateOther.status, 404);
    console.log('   Passed: User 2 cannot modify User 1 note');

    // User 2 attempts to DELETE User 1's note
    const resUser2DeleteOther = await request({
      path: `/api/notes/${note1Id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    assert.strictEqual(resUser2DeleteOther.status, 404);
    console.log('   Passed: User 2 cannot delete User 1 note');

    // Test 15: Delete note by User 1 (Owner)
    console.log('Test 15: Owner deletes note');
    const resDelete = await request({
      path: `/api/notes/${note1Id}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(resDelete.status, 200);
    assert.strictEqual(resDelete.body.message, 'Note deleted successfully.');
    console.log('   Passed: Owner deleted note successfully');

    // Verify deleted note is gone
    const resCheckDeleted = await request({
      path: `/api/notes/${note1Id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    assert.strictEqual(resCheckDeleted.status, 404);
    console.log('   Passed: Deleted note is no longer accessible');

    console.log('\n ALL 15 AUTOMATED TESTS PASSED SUCCESSFULLY! \n');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error(' Test failed:', err);
  if (server) server.close();
  process.exit(1);
});
