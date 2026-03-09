#!/usr/bin/env node
/**
 * Gmail Tool - Multi-Account Version (v2)
 *
 * Search, read, and modify emails via Gmail API with support for multiple accounts.
 *
 * Setup:
 *   node gmail-search-v2.js account:add <name>             # Add new account
 *   node gmail-search-v2.js account:list                  # List all accounts
 *   node gmail-search-v2.js account:remove <name>         # Remove account
 *   node gmail-search-v2.js account:select <name>         # Set default account
 *
 * Read:
 *   node gmail-search-v2.js search <query>                # Search emails
 *   node gmail-search-v2.js get <messageId>               # Get full email
 *   node gmail-search-v2.js attachments <messageId>       # List attachments
 *   node gmail-search-v2.js download <messageId> [dir]    # Download attachments
 *
 * Modify:
 *   node gmail-search-v2.js read <messageId>              # Mark as read
 *   node gmail-search-v2.js unread <messageId>            # Mark as unread
 *   node gmail-search-v2.js archive <messageId>           # Archive (remove from inbox)
 *   node gmail-search-v2.js unarchive <messageId>         # Move back to inbox
 *   node gmail-search-v2.js star <messageId>              # Star message
 *   node gmail-search-v2.js unstar <messageId>            # Unstar message
 *   node gmail-search-v2.js trash <messageId>             # Move to trash
 *
 * Labels:
 *   node gmail-search-v2.js labels                        # List all labels
 *   node gmail-search-v2.js label <msgId> <labelName>     # Add label
 *   node gmail-search-v2.js unlabel <msgId> <labelName>   # Remove label
 *
 * NOTE: Uses separate token files per account stored in credentials/gmail/
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Load account configuration
const accountConfig = require('../../memory/knowledge/gmail-account-config.js');

// Paths
const CREDENTIALS_PATH = '/home/papperpictures/.openclaw/credentials/google-oauth-client.json';
const TOKENS_DIR = '/home/papperpictures/.openclaw/credentials/gmail';

// Gmail scopes - read and modify (labels, archive, mark read/unread)
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify'
];

// Load credentials (shared for all accounts)
function loadCredentials() {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  return JSON.parse(content).installed;
}

// Load tokens for specific account
function loadTokens(accountName) {
  const tokensPath = path.join(TOKENS_DIR, `${accountName}.json`);

  if (!fs.existsSync(tokensPath)) {
    throw new Error(`No tokens found for account "${accountName}".\nPlease run: node gmail-search-v2.js account:add ${accountName}`);
  }

  const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  return tokens;
}

// Save tokens for specific account
function saveTokens(accountName, tokens) {
  const tokensPath = path.join(TOKENS_DIR, `${accountName}.json`);
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
  console.log(`Tokens saved to ${tokensPath}`);
}

// Generate auth URL for specific account
function generateAuthUrl(accountName) {
  const account = accountConfig.getAccount(name);
  const creds = loadCredentials();

  // Use account-specific redirect URI
  const redirectUri = `http://localhost:${accountName === 'papperpictures' ? 8080 : 8081}`;

  const params = new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
}

// Exchange code for tokens (account-specific)
async function exchangeCode(accountName, code) {
  const account = accountConfig.getAccount(name);
  const creds = loadCredentials();

  const data = new URLSearchParams({
    code: code,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    redirect_uri: `http://localhost:${accountName === 'papperpictures' ? 8080 : 8081}`,
    grant_type: 'authorization_code'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const tokens = JSON.parse(body);
        if (tokens.error) {
          reject(new Error(tokens.error_description || tokens.error));
        } else {
          resolve(tokens);
        }
      });
    });
    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

// Refresh access token for specific account
async function refreshAccessToken(accountName) {
  const account = accountConfig.getAccount(name);
  const creds = loadCredentials();
  const tokens = loadTokens(accountName);

  if (!tokens.refresh_token) {
    throw new Error(`No refresh token available for account "${accountName}". Re-run authorization.`);
  }

  const data = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const newTokens = JSON.parse(body);
        if (newTokens.error) {
          reject(new Error(newTokens.error_description || newTokens.error));
        } else {
          if (!newTokens.refresh_token) {
            newTokens.refresh_token = tokens.refresh_token;
          }
          saveTokens(accountName, newTokens);
          resolve(newTokens);
        }
      });
    });
    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

// Make Gmail API request for specific account
async function gmailRequest(accountName, path, retried = false) {
  const tokens = loadTokens(accountName);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', async () => {
        const data = JSON.parse(body);
        if (data.error) {
          if (data.error.code === 401 && !retried) {
            console.log(`Token expired for "${accountName}", refreshing...`);
            await refreshAccessToken(accountName);
            resolve(gmailRequest(accountName, path, true));
          } else {
            reject(new Error(data.error.message || JSON.stringify(data.error)));
          }
        } else {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Make Gmail API POST request for specific account
async function gmailRequestPost(accountName, path, body) {
  const tokens = loadTokens(accountName);
  const accessToken = tokens.access_token;

  if (tokens.expiry_date && Date.now() > tokens.expiry_date) {
    console.log(`Token expired for "${accountName}", refreshing...`);
    await refreshAccessToken(accountName);
    const newTokens = loadTokens(accountName);
    accessToken = newTokens.access_token;
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'gmail.googleapis.com',
      path: path,
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

// Search emails for specific account
async function searchEmails(accountName, query) {
  const encodedQuery = encodeURIComponent(query);
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=20`);

  if (!data.messages || data.messages.length === 0) {
    console.log(`No messages found for query: ${query}`);
    return [];
  }

  console.log(`\nFound ${data.messages.length} messages for account "${accountName}":\n`);

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

// Find all attachments recursively
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

// List attachments for account
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

// Download specific attachment for account
async function downloadAttachment(accountName, messageId, attachmentId, filename, outputDir) {
  const path = `/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;
  const data = await gmailRequest(accountName, path);

  if (!data.data) {
    throw new Error('No attachment data returned');
  }

  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');

  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, buffer);

  return outputPath;
}

// Download all attachments for account
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

// Modify message labels for account
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

// Mark as read
async function markAsRead(accountName, messageId) {
  console.log(`Marking ${messageId} as read for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, [], ['UNREAD']);
  console.log('✅ Marked as read');
}

// Mark as unread
async function markAsUnread(accountName, messageId) {
  console.log(`Marking ${messageId} as unread for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, ['UNREAD'], []);
  console.log('✅ Marked as unread');
}

// Archive message
async function archiveMessage(accountName, messageId) {
  console.log(`Archiving ${messageId} for account "${accountName}"...`);
  await modifyMessage(accountName, messageId, [], ['INBOX']);
  console.log('✅ Archived (removed from inbox)');
}

// Move to inbox
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

// List labels for account
async function listLabels(accountName) {
  const data = await gmailRequest(accountName, '/gmail/v1/users/me/labels');

  console.log(`Available labels for account "${accountName}":\n`);
  for (const label of data.labels) {
    console.log(`  ${label.name} (${label.id})`);
  }

  return data.labels;
}

// Add label to message
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

// Remove label from message
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

// Account management functions

// Add new account
async function addAccount(name) {
  try {
    accountConfig.getAccount(name);
    console.error(`Account "${name}" already exists.`);
    console.log('Available accounts:', Object.keys(accountConfig.ACCOUNTS).join(', '));
    return;
  } catch (e) {
    // Account doesn't exist - that's expected
  }

  console.log(`Setting up account "${name}"...`);
  console.log('1. Opening authorization URL in browser...');

  const authUrl = generateAuthUrl(name);
  console.log('\nAuthorization URL:');
  console.log(authUrl);

  console.log('\n2. After authorizing, copy the CODE from the URL and run:');
  console.log(`   node gmail-search-v2.js account:auth ${name} <CODE>`);
  console.log('\nNote: Make sure to copy the full code including the "code=" parameter');
}

// Exchange authorization code
async function exchangeAuthCode(name, code) {
  console.log(`Exchanging code for tokens for account "${name}"...`);

  try {
    const tokens = await exchangeCode(name, code);
    saveTokens(name, tokens);

    const account = accountConfig.getAccount(name);
    console.log(`\n✅ Successfully configured account "${name}" (${account.email})!`);
    console.log('\nYou can now use this account:');
    console.log(`   node gmail-search-v2.js search "<query>" --account ${name}`);
  } catch (e) {
    console.error(`\n❌ Failed to configure account "${name}": ${e.message}`);
    console.error('\nMake sure you copied the full authorization code from the URL');
    process.exit(1);
  }
}

// Remove account
async function removeAccount(name) {
  console.log(`Removing account "${name}"...`);

  const tokensPath = path.join(TOKENS_DIR, `${name}.json`);

  if (!fs.existsSync(tokensPath)) {
    console.error(`No tokens found for account "${name}". Account is not configured.`);
    return;
  }

  fs.unlinkSync(tokensPath);
  console.log(`✅ Account "${name}" removed. Tokens deleted.`);
  console.log('\nNote: Messages are NOT deleted. To delete all emails from this account, use:');
  console.log(`   node gmail-search-v2.js --account ${name} trash all:in:inbox`);
}

// List all accounts
async function listAccounts() {
  const accounts = accountConfig.listAccounts();

  console.log('Configured Gmail Accounts:\n');
  for (const account of accounts) {
    const tokensPath = path.join(TOKENS_DIR, `${account.name}.json`);
    const hasTokens = fs.existsSync(tokensPath);

    console.log(`${account.name.padEnd(15)} ${account.email.padEnd(30)} ${account.tone.padEnd(15)} ${account.useCase}`);
    console.log(`   Aliases: ${account.aliases.join(', ')}`);
    console.log(`   Priority: ${account.priority}`);
    console.log(`   Status: ${hasTokens ? '✅ Authorized' : '❌ Not configured'}`);
    console.log('');
  }
}

// Set default account
async function selectAccount(name) {
  try {
    accountConfig.getAccount(name);
    console.log(`Default account set to "${name}" (${accountConfig.getAccount(name).email})`);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  console.log('Gmail Tool - Multi-Account Version (v2)\n');

  console.log('ACCOUNT MANAGEMENT:');
  console.log('  account:add <name>      Add a new account (start OAuth flow)');
  console.log('  account:auth <name> <code>  Exchange code for tokens');
  console.log('  account:remove <name>  Remove account (delete tokens)');
  console.log('  account:list           List all configured accounts');
  console.log('  account:select <name>  Set default account\n');

  console.log('EMAIL SEARCH:');
  console.log('  search <query>          Search emails (uses default account)');
  console.log('  search <query> --account <name>  Search using specific account\n');

  console.log('EMAIL OPERATIONS:');
  console.log('  get <messageId>         Get full email');
  console.log('  attachments <messageId> List attachments');
  console.log('  download <messageId> [dir]  Download attachments');
  console.log('  read <messageId>        Mark as read');
  console.log('  unread <messageId>      Mark as unread');
  console.log('  archive <messageId>     Archive (remove from inbox)');
  console.log('  unarchive <messageId>   Move to inbox');
  console.log('  star <messageId>        Star message');
  console.log('  unstar <messageId>      Unstar message');
  console.log('  trash <messageId>       Move to trash\n');

  console.log('LABELS:');
  console.log('  labels                  List all labels');
  console.log('  label <msgId> <labelName>  Add label to message');
  console.log('  unlabel <msgId> <labelName>  Remove label from message\n');

  console.log('EXAMPLES:');
  console.log('  # Add new account');
  console.log('  node gmail-search-v2.js account:add urbandanceteam');
  console.log('');
  console.log('  # Search using specific account');
  console.log('  node gmail-search-v2.js search "subject:Dance" --account urbandanceteam');
  console.log('');
  console.log('  # Search using default account');
  console.log('  node gmail-search-v2.js search "subject:Dance"');
  console.log('');
  console.log('  # Get email from account');
  console.log('  node gmail-search-v2.js get <messageId> --account studio306nl');
  console.log('');
  console.log('  # Set default account');
  console.log('  node gmail-search-v2.js account:select papperpictures');
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'account:add':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js account:add <name>');
          process.exit(1);
        }
        await addAccount(args[1]);
        break;

      case 'account:auth':
        if (args.length < 3) {
          console.error('Usage: node gmail-search-v2.js account:auth <name> <code>');
          process.exit(1);
        }
        await exchangeAuthCode(args[1], args[2]);
        break;

      case 'account:remove':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js account:remove <name>');
          process.exit(1);
        }
        await removeAccount(args[1]);
        break;

      case 'account:list':
        await listAccounts();
        break;

      case 'account:select':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js account:select <name>');
          process.exit(1);
        }
        await selectAccount(args[1]);
        break;

      case 'search':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js search <query>');
          process.exit(1);
        }
        const accountName = args.find(arg => arg.startsWith('--account='));
        const account = accountName ? accountName.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await searchEmails(account, args.slice(1).join(' '));
        break;

      case 'get':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js get <messageId>');
          process.exit(1);
        }
        const msgAccountId = args.find(arg => arg.startsWith('--account='));
        const msgAccount = msgAccountId ? msgAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await getMessage(msgAccount, args[1]);
        break;

      case 'attachments':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js attachments <messageId>');
          process.exit(1);
        }
        const attAccountId = args.find(arg => arg.startsWith('--account='));
        const attAccount = attAccountId ? attAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await listAttachments(attAccount, args[1]);
        break;

      case 'download':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js download <messageId> [outputDir]');
          process.exit(1);
        }
        const downAccountId = args.find(arg => arg.startsWith('--account='));
        const downAccount = downAccountId ? downAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        const outputDir = args[2] || '/tmp';
        await downloadAllAttachments(downAccount, args[1], outputDir);
        break;

      case 'read':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js read <messageId>');
          process.exit(1);
        }
        const readAccountId = args.find(arg => arg.startsWith('--account='));
        const readAccount = readAccountId ? readAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await markAsRead(readAccount, args[1]);
        break;

      case 'unread':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js unread <messageId>');
          process.exit(1);
        }
        const unreadAccountId = args.find(arg => arg.startsWith('--account='));
        const unreadAccount = unreadAccountId ? unreadAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await markAsUnread(unreadAccount, args[1]);
        break;

      case 'archive':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js archive <messageId>');
          process.exit(1);
        }
        const archiveAccountId = args.find(arg => arg.startsWith('--account='));
        const archiveAccount = archiveAccountId ? archiveAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await archiveMessage(archiveAccount, args[1]);
        break;

      case 'unarchive':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js unarchive <messageId>');
          process.exit(1);
        }
        const unarchiveAccountId = args.find(arg => arg.startsWith('--account='));
        const unarchiveAccount = unarchiveAccountId ? unarchiveAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await moveToInbox(unarchiveAccount, args[1]);
        break;

      case 'star':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js star <messageId>');
          process.exit(1);
        }
        const starAccountId = args.find(arg => arg.startsWith('--account='));
        const starAccount = starAccountId ? starAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await starMessage(starAccount, args[1]);
        break;

      case 'unstar':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js unstar <messageId>');
          process.exit(1);
        }
        const unstarAccountId = args.find(arg => arg.startsWith('--account='));
        const unstarAccount = unstarAccountId ? unstarAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await unstarMessage(unstarAccount, args[1]);
        break;

      case 'trash':
        if (args.length < 2) {
          console.error('Usage: node gmail-search-v2.js trash <messageId>');
          process.exit(1);
        }
        const trashAccountId = args.find(arg => arg.startsWith('--account='));
        const trashAccount = trashAccountId ? trashAccountId.split('=')[1] : accountConfig.DEFAULT_ACCOUNT;
        await trashMessage(trashAccount, args[1]);
        break;

      case 'labels':
        await listLabels(accountConfig.DEFAULT_ACCOUNT);
        break;

      case 'label':
        if (args.length < 3) {
          console.error('Usage: node gmail-search-v2.js label <messageId> <labelName>');
          process.exit(1);
        }
        await addLabel(accountConfig.DEFAULT_ACCOUNT, args[1], args[2]);
        break;

      case 'unlabel':
        if (args.length < 3) {
          console.error('Usage: node gmail-search-v2.js unlabel <messageId> <labelName>');
          process.exit(1);
        }
        await removeLabel(accountConfig.DEFAULT_ACCOUNT, args[1], args[2]);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('\nRun without arguments to see help:');
        console.error('  node gmail-search-v2.js');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
