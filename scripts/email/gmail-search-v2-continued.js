// Search emails for specific account
async function searchEmails(accountName, query) {
  const encodedQuery = encodeURIComponent(query);
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=20`);

  if (!data.messages || data.messages.length === 0) {
    console.log(`No messages found for query: ${query}`);
    return [];
  }

  console.log(`\nFound ${data.messages.length} messages for account "${accountName}":\n`);

  // Get details for each message
  for (const msg of data.messages) {
    const details = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);

    const headers = {};
    for (const h of details.payload.headers) {
      headers[h.name] = h.value;
    }

    console.log(`ID: ${msg.id}`);
    console.log(`From: ${headers.From || 'unknown'}`);
    console.log(`Subject: ${headers.Subject || '(no subject)'}`);
    console.log(`Date: ${headers.Date || 'unknown'}`);
    console.log(`Labels: ${details.labelIds?.join(', ') || 'none'}`);
    console.log('---');
  }

  return data.messages;
}

// Get full email content for specific account
async function getMessage(accountName, messageId) {
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}?format=full`);

  const headers = {};
  for (const h of data.payload.headers) {
    headers[h.name] = h.value;
  }

  console.log('From:', headers.From);
  console.log('To:', headers.To);
  console.log('Subject:', headers.Subject);
  console.log('Date:', headers.Date);
  console.log('Labels:', data.labelIds?.join(', '));
  console.log('\n--- Body ---\n');

  // Extract body
  function getBody(payload) {
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8');
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf8');
        }
      }
      // Try HTML if no plain text
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf8');
        }
      }
    }
    return '(no body)';
  }

  console.log(getBody(data.payload));
}

// List attachments for message from specific account
async function listAttachments(accountName, messageId) {
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}?format=full`);

  const headers = {};
  for (const h of data.payload.headers) {
    headers[h.name] = h.value;
  }

  console.log('From:', headers.From);
  console.log('Subject:', headers.Subject);
  console.log('Date:', headers.Date);
  console.log('\n--- Attachments ---\n');

  const attachments = findAttachments(data.payload);

  if (attachments.length === 0) {
    console.log('No attachments found.');
    return [];
  }

  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const sizeKb = Math.round(att.size / 1024);
    console.log(`[${i + 1}] ${att.filename}`);
    console.log(`    Type: ${att.mimeType}`);
    console.log(`    Size: ${sizeKb} KB`);
    console.log(`    ID: ${att.attachmentId}`);
    console.log('');
  }

  return attachments;
}

// Download specific attachment from message for specific account
async function downloadAttachment(accountName, messageId, attachmentId, filename, outputDir) {
  const path = `/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  const data = await gmailRequest(accountName, path);

  if (!data.data) {
    throw new Error('No attachment data returned');
  }

  // Gmail uses URL-safe base64, need to convert
  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

// Download all attachments from message for specific account
async function downloadAllAttachments(accountName, messageId, outputDir = '/tmp') {
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}?format=full`);

  const headers = {};
  for (const h of data.payload.headers) {
    headers[h.name] = h.value;
  }

  console.log('From:', headers.From);
  console.log('Subject:', headers.Subject);
  console.log('Output directory:', outputDir);
  console.log('\n--- Downloading Attachments ---\n');

  const attachments = findAttachments(data.payload);

  if (attachments.length === 0) {
    console.log('No attachments found.');
    return [];
  }

  const downloaded = [];
  for (const att of attachments) {
    try {
      const outputPath = await downloadAttachment(accountName, messageId, att.attachmentId, att.filename, outputDir);
      console.log(`✅ ${att.filename} -> ${outputPath}`);
      downloaded.push(outputPath);
    } catch (e) {
      console.error(`❌ ${att.filename}: ${e.message}`);
    }
  }

  console.log(`\nDownloaded ${downloaded.length}/${attachments.length} attachments.`);
  return downloaded;
}

// Modify message labels (mark read, archive, etc.) for specific account
async function modifyMessage(accountName, messageId, addLabels = [], removeLabels = []) {
  const tokens = loadTokens(accountName);
  const accessToken = tokens.access_token;

  const body = JSON.stringify({
    addLabelIds: addLabels,
    removeLabelIds: removeLabels
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: `/gmail/v1/users/me/messages/${messageId}/modify`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Gmail API error ${res.statusCode}: ${data}`));
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Mark message as read
async function markAsRead(accountName, messageId) {
  console.log(`Marking ${messageId} as read for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, [], ['UNREAD']);
  console.log('✅ Marked as read');
}

// Mark message as unread
async function markAsUnread(accountName, messageId) {
  console.log(`Marking ${messageId} as unread for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, ['UNREAD'], []);
  console.log('✅ Marked as unread');
}

// Archive message (remove from inbox)
async function archiveMessage(accountName, messageId) {
  console.log(`Archiving ${messageId} for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, [], ['INBOX']);
  console.log('✅ Archived (removed from inbox)');
}

// Move to inbox (unarchive)
async function moveToInbox(accountName, messageId) {
  console.log(`Moving ${messageId} to inbox for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, ['INBOX'], []);
  console.log('✅ Moved to inbox');
}

// Star message
async function starMessage(accountName, messageId) {
  console.log(`Starring ${messageId} for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, ['STARRED'], []);
  console.log('✅ Starred');
}

// Unstar message
async function unstarMessage(accountName, messageId) {
  console.log(`Unstarring ${messageId} for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, [], ['STARRED']);
  console.log('✅ Unstarred');
}

// Trash message
async function trashMessage(accountName, messageId) {
  const tokens = loadTokens(accountName);
  const accessToken = tokens.access_token;

  const body = JSON.stringify({});

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: `/gmail/v1/users/me/messages/${messageId}/trash`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`Gmail API error ${res.statusCode}: ${data}`));
        } else {
          console.log('✅ Moved to trash');
          resolve(JSON.parse(data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// List available labels for account
async function listLabels(accountName) {
  const data = await gmailRequest(accountName, '/gmail/v1/users/me/labels');

  console.log(`Available labels for account "${accountName}":\n`);
  for (const label of data.labels) {
    console.log(`  ${label.name} (${label.id})`);
  }

  return data.labels;
}

// Add custom label to message for account
async function addLabel(accountName, messageId, labelName) {
  const data = await gmailRequest(accountName, '/gmail/v1/users/me/labels');
  const label = data.labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());

  if (!label) {
    console.error(`Label not found: ${labelName}`);
    console.log('Available labels:');
    data.labels.forEach(l => console.log(`  ${l.name}`));
    return;
  }

  console.log(`Adding label "${label.name}" to ${messageId}...`);
  await modifyMessage(accountName, messageId, [label.id], []);
  console.log(`✅ Added label: ${label.name}`);
}

// Remove custom label from message for account
async function removeLabel(accountName, messageId, labelName) {
  const data = await gmailRequest(accountName, '/gmail/v1/users/me/labels');
  const label = data.labels.find(l => l.name.toLowerCase() === labelName.toLowerCase());

  if (!label) {
    console.error(`Label not found: ${labelName}`);
    return;
  }

  console.log(`Removing label "${label.name}" from ${messageId}...`);
  await modifyMessage(accountName, messageId, [], [label.id]);
  console.log(`✅ Removed label: ${label.name}`);
}

// Find all attachments recursively in message payload
function findAttachments(payload, attachments = []) {
  if (payload.filename && payload.body?.attachmentId) {
    attachments.push({
      filename: payload.filename,
      mimeType: payload.mimeType,
      attachmentId: payload.body.attachmentId,
      size: payload.body.size
    });
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      findAttachments(part, attachments);
    }
  }
  return attachments;
}
