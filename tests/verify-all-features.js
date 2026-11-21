const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyAllFeatures() {
  console.log('====================================================');
  console.log(' VERIFYING ALL NOTES APPLICATION FEATURES ON LIVE SERVER');
  console.log(' Target: http://localhost:5000');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testEmail = `tester_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  let authToken;
  let note1Id, note2Id, note3Id;

  // 1. Verify Registration Works
  console.log('1. Checking Registration...');
  const regRes = await request('/api/auth/register', { method: 'POST' }, {
    email: testEmail,
    password: testPassword,
    confirmPassword: testPassword
  });
  assert.strictEqual(regRes.status, 201, 'Registration should return 201');
  assert.ok(regRes.body.token, 'Registration should return auth token');
  assert.strictEqual(regRes.body.user.email, testEmail);
  authToken = regRes.body.token;
  console.log('   Registration works! (User registered and token issued)\n');

  // 2. Verify Session & /api/auth/me Works
  console.log('2. Checking Session Retrieval (/api/auth/me)...');
  const meRes = await request('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.email, testEmail);
  console.log('   Session verified successfully!\n');

  // 3. Verify Creating Notes & Long Notes Works
  console.log('3. Checking Creation of Long Notes (No Character Limit)...');
  const longText = `
# Chapter 1: Operating System Architectures
An operating system is system software that manages computer hardware, software resources, and provides common services for computer programs.

## Key Subsystems:
1. Process Management & Multithreading
2. Memory Virtualization & Page Tables
3. File System Hierarchies & Inode Allocation
4. I/O Device Driver Subsystems

## Code Example:
\`\`\`c
#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        printf("Running in child process\\n");
    } else {
        printf("Running in parent process\\n");
    }
    return 0;
}
\`\`\`

` + 'Detailed explanatory study notes and documentation paragraphs. '.repeat(60);

  const createNote1Res = await request('/api/notes', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  }, {
    title: 'Operating System Architecture & Kernel Internals',
    content: longText
  });

  assert.strictEqual(createNote1Res.status, 201);
  assert.strictEqual(createNote1Res.body.message, 'Note saved successfully.');
  assert.strictEqual(createNote1Res.body.note.title, 'Operating System Architecture & Kernel Internals');
  assert.strictEqual(createNote1Res.body.note.content, longText);
  note1Id = createNote1Res.body.note.id;
  console.log(`   Long note created successfully! (ID: ${note1Id}, Length: ${longText.length} chars)\n`);

  // 4. Verify Multiple Notes Creation
  console.log('4. Checking Multiple Notes Creation...');
  const createNote2Res = await request('/api/notes', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  }, {
    title: 'Distributed Systems & Raft Consensus',
    content: 'Raft is a consensus algorithm that is designed to be easy to understand. It is equivalent to Paxos in fault-tolerance and performance.'
  });
  assert.strictEqual(createNote2Res.status, 201);
  note2Id = createNote2Res.body.note.id;

  const createNote3Res = await request('/api/notes', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  }, {
    title: 'Temporary Note to Delete',
    content: 'This note was created strictly to test the delete functionality.'
  });
  assert.strictEqual(createNote3Res.status, 201);
  note3Id = createNote3Res.body.note.id;
  console.log(`   Multiple notes created! (IDs: ${note1Id}, ${note2Id}, ${note3Id})\n`);

  // 5. Verify Saved Notes Appear in the Interface (GET /api/notes)
  console.log('5. Checking Saved Notes Listing & Sorting...');
  const listRes = await request('/api/notes', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(listRes.status, 200);
  assert.strictEqual(listRes.body.notes.length, 3);
  // Latest updated should be note3Id
  assert.strictEqual(listRes.body.notes[0].id, note3Id);
  console.log('   Saved notes list retrieved! Notes are sorted latest-first.\n');

  // 6. Verify Editing Notes Works (PUT /api/notes/:id)
  console.log('6. Checking Note Editing...');
  const updatedTitle = 'Operating System Architecture (Advanced 2nd Edition)';
  const updatedContent = longText + '\n\n[Revision]: Added section on microkernels and IPC messaging.';

  const updateRes = await request(`/api/notes/${note1Id}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${authToken}` }
  }, {
    title: updatedTitle,
    content: updatedContent
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.body.message, 'Note updated successfully.');
  assert.strictEqual(updateRes.body.note.title, updatedTitle);
  assert.strictEqual(updateRes.body.note.content, updatedContent);
  console.log('   Note edited and updated successfully!\n');

  // 7. Verify Deleting Notes Works (DELETE /api/notes/:id)
  console.log('7. Checking Note Deletion...');
  const deleteRes = await request(`/api/notes/${note3Id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(deleteRes.status, 200);
  assert.strictEqual(deleteRes.body.message, 'Note deleted successfully.');

  // Verify it is no longer in the list
  const listAfterDelete = await request('/api/notes', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(listAfterDelete.body.notes.length, 2);
  const exists = listAfterDelete.body.notes.some(n => n.id === note3Id);
  assert.strictEqual(exists, false, 'Deleted note should no longer appear');
  console.log('   Note deleted successfully and removed from list!\n');

  // 8. Verify Search Functionality Works
  console.log('8. Checking Search Filter...');
  const searchRes = await request('/api/notes?search=Raft', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(searchRes.status, 200);
  assert.strictEqual(searchRes.body.notes.length, 1);
  assert.strictEqual(searchRes.body.notes[0].id, note2Id);
  console.log('   Search filter works! Matched specific note.\n');

  // 9. Verify Browser Refresh Simulation (Persistence in Database)
  console.log('9. Checking Database Persistence across simulated refresh...');
  const refreshRes = await request('/api/notes', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  assert.strictEqual(refreshRes.status, 200);
  assert.strictEqual(refreshRes.body.notes.length, 2);
  assert.strictEqual(refreshRes.body.notes[0].id, note1Id); // note1 was updated so it is now latest
  console.log('   Database persistence verified: all notes intact!\n');

  // 10. Verify Logout Works
  console.log('10. Checking Logout...');
  const logoutRes = await request('/api/auth/logout', { method: 'POST' });
  assert.strictEqual(logoutRes.status, 200);
  console.log('   Logout successful!\n');

  // 11. Verify Logging In Again & Recovering Saved Notes
  console.log('11. Checking Login with Credentials & Restoring Saved Notes...');
  const loginRes = await request('/api/auth/login', { method: 'POST' }, {
    email: testEmail,
    password: testPassword
  });
  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  const newLoginToken = loginRes.body.token;

  const notesAfterReLogin = await request('/api/notes', {
    headers: { 'Authorization': `Bearer ${newLoginToken}` }
  });
  assert.strictEqual(notesAfterReLogin.status, 200);
  assert.strictEqual(notesAfterReLogin.body.notes.length, 2);
  assert.strictEqual(notesAfterReLogin.body.notes[0].title, updatedTitle);
  console.log('   Re-login successful! All previously saved notes are loaded perfectly.\n');

  console.log('====================================================');
  console.log(' ALL 11 VERIFICATION CHECKS PASSED ON LIVE SERVER!');
  console.log('====================================================\n');
}

verifyAllFeatures().catch(err => {
  console.error(' Verification error:', err);
  process.exit(1);
});
