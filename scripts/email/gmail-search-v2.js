#!/usr/bin/env node
/**
 * Gmail Tool - Multi-Account Search, read, and modify emails via Gmail API
 *
 * Setup (per account):
 *   node gmail-search-v2.js --account urbandanceteam url
 *   node gmail-search-v2.js --account urbandanceteam code <CODE>
 *
 * Read:
 *   node gmail-search-v2.js --account urbandanceteam search "subject:Dance"
 *   node gmail-search-v2.js --account urbandanceteam get <messageId>
 *   node gmail-search-v2.js --account urbandanceteam attachments <messageId>
 *   node gmail-search-v2.js --account urbandanceteam download <messageId> [dir]
 *
 * Modify:
 *   node gmail-search-v2.js --account urbandanceteam read <messageId>
 *   node gmail-search-v2.js --account urbandanceteam unread <messageId>
 *   node gmail-search-v2.js --account urbandanceteam archive <messageId>
 *   node gmail-search-v2.js --account urbandanceteam unarchive <messageId>
 *   node gmail-search-v2.js --account urbandanceteam star <messageId>
 *   node gmail-search-v2.js --account urbandanceteam unstar <messageId>
 *   node gmail-search-v2.js --account urbandanceteam trash <messageId>
 *
 * Labels:
 *   node gmail-search-v2.js --account urbandanceteam labels
 *   node gmail-search-v2.js --account urbandanceteam label <msgId> <labelName>
 *   node gmail-search-v2.js --account urbandanceteam unlabel <msgId> <labelName>
 *
 * No --account flag = use default account from config
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Load account configuration
const configPath = path.join(__dirname, '..', '..', '..', 'agents', 'nimbus', 'workspace', 'memory', 'knowledge', 'gmail-account-config.js');
const accounts = require(configPath);

// Paths
const CREDENTIALS_PATH = '/home/papperpictures/.openclaw/credentials/google-oauth-client.json';
const TOKENS_DIR = '/home/papperpictures/.openclaw/credentials/gmail';

// Gmail scopes - read and modify (labels, archive, mark read/unread)
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify'
];

let selectedAccount = accounts.DEFAULT_ACCOUNT;

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { action: null, account: null, params: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--account') {
      result.account = args[++i];
    } else if (!arg.startsWith('--') && !result.action) {
      result.action = arg;
    } else if (!arg.startsWith('--')) {
      result.params.push(arg);
    }
  }

  return result;
}

function selectAccount(accountName) {
  if (!accountName) {
    selectedAccount = accounts.DEFAULT_ACCOUNT;
  } else {
    selectedAccount = accountName;
  }

  console.log(`Selected account: ${selectedAccount}`);
  console.log(`Email: ${accounts.getAccount(selectedAccount).email}`);
}

async function getTokensPath(accountName) {
  const account = accounts.getAccount(accountName);
  return path.join(TOKENS_DIR, `${accountName}.json`);
}

function loadCredentials() {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  return JSON.parse(content).installed;
}

function loadTokens(accountName) {
  const tokensPath = getTokensPath(accountName);

  if (!fs.existsSync(tokensPath)) {
    console.error(`No tokens found for ${accountName}. Run: node gmail-search-v2.js --account ${accountName} url`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
}

function saveTokens(accountName, tokens) {
  const tokensPath = getTokensPath(accountName);
  fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
  console.log(`Tokens saved to ${tokensPath}`);
}

function generateAuthUrl(accountName) {
  const creds = loadCredentials();
  const account = accounts.getAccount(accountName);
  const params = new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: 'http://localhost',
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
}

async function exchangeCode(accountName, code) {
  const creds = loadCredentials();
  const account = accounts.getAccount(accountName);

  const data = new URLSearchParams({
    code: code,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    redirect_uri: 'http://localhost',
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
          // Save tokens
          saveTokens(accountName, tokens);
          resolve(tokens);
        }
      });
    });
    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

async function refreshAccessToken(accountName) {
  const creds = loadCredentials();
  const tokens = loadTokens(accountName);

  if (!tokens.refresh_token) {
    throw new Error(`No refresh token available for ${accountName}`);
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
          // Preserve refresh token if not returned
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
            console.log(`Token expired for ${accountName}, refreshing...`);
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

async function searchEmails(accountName, query) {
  const encodedQuery = encodeURIComponent(query);
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=20`);

  if (!data.messages || data.messages.length === 0) {
    console.log(`No messages found for query: ${query}`);
    return [];
  }

  const account = accounts.getAccount(accountName);
  console.log(`\nFound ${data.messages.length} messages for "${query}":\n`);

  // Get details for each message
  for (const msg of data.messages) {
    const details = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);

    console.log(`--- Message ${msg.id} ---`);
    console.log(`Subject: ${details.payload.headers.find(h => h.name === 'Subject')?.value || 'N/A'}`);
    console.log(`From: ${details.payload.headers.find(h => h.name === 'From')?.value || 'N/A'}`);
    console.log(`Date: ${details.payload.headers.find(h => h.name === 'Date')?.value || 'N/A'}`);
    console.log();
  }

  return data.messages;
}

async function getMessage(accountName, messageId) {
  const data = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}?format=full`);
  return data;
}

async function getAttachments(accountName, messageId) {
  const message = await getMessage(accountName, messageId);

  if (!message.payload.parts || message.payload.parts.length === 0) {
    console.log('No attachments in this message');
    return [];
  }

  const attachments = [];
  for (const part of message.payload.parts) {
    if (part.filename && part.body.attachmentId) {
      const attachment = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`);
      attachments.push({
        filename: part.filename,
        size: attachment.size,
        mimeType: part.mimeType
      });
    }
  }

  return attachments;
}

async function downloadAttachments(accountName, messageId, directory = '.') {
  const attachments = await getAttachments(accountName, messageId);
  const account = accounts.getAccount(accountName);

  console.log(`\nDownloading ${attachments.length} attachment(s)...\n`);

  for (const att of attachments) {
    const attachment = await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}/attachments/${encodeURIComponent(att.attachmentId)}`);
    const decoded = Buffer.from(attachment.data, 'base64');
    const filePath = path.join(directory, att.filename);
    fs.writeFileSync(filePath, decoded);
    console.log(`✓ Saved: ${filePath} (${(decoded.length / 1024).toFixed(2)} KB)`);
  }
}

async function modifyMessage(accountName, messageId, action) {
  const account = accounts.getAccount(accountName);
  const endpoint = `/gmail/v1/users/me/messages/${messageId}/${action}`;

  await gmailRequest(accountName, endpoint, true);
  console.log(`✓ Marked message ${messageId} as ${action}`);
}

async function getLabels(accountName) {
  const data = await gmailRequest(accountName, '/gmail/v1/users/me/labels');

  if (!data.labels || data.labels.length === 0) {
    console.log('No labels found');
    return [];
  }

  const account = accounts.getAccount(accountName);
  console.log(`\nLabels for ${account.email}:\n`);

  for (const label of data.labels) {
    if (label.id !== 'INBOX' && label.id !== 'SPAM' && label.id !== 'TRASH' && label.id !== 'UNREAD') {
      console.log(`${label.id}: ${label.name}`);
    }
  }

  return data.labels;
}

async function addLabel(accountName, messageId, labelName) {
  const labels = await getLabels(accountName);
  const labelId = labels.find(l => l.name === labelName)?.id;

  if (!labelId) {
    throw new Error(`Label "${labelName}" not found`);
  }

  // Add label to message
  await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}/labels`, true, { addLabelIds: [labelId] });
  console.log(`✓ Added label "${labelName}" to message ${messageId}`);
}

async function removeLabel(accountName, messageId, labelName) {
  const labels = await getLabels(accountName);
  const labelId = labels.find(l => l.name === labelName)?.id;

  if (!labelId) {
    throw new Error(`Label "${labelName}" not found`);
  }

  await gmailRequest(accountName, `/gmail/v1/users/me/messages/${messageId}/labels`, true, { removeLabelIds: [labelId] });
  console.log(`✓ Removed label "${labelName}" from message ${messageId}`);
}

// Main command dispatcher
async function main() {
  const args = parseArgs();

  // Set account if specified
  if (args.account) {
    try {
      selectAccount(args.account);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  } else {
    console.log(`Using default account: ${selectedAccount}`);
  }

  // Show account info
  const account = accounts.getAccount(selectedAccount);
  console.log(`Email: ${account.email}`);
  console.log(`Name: ${account.name}`);
  console.log(`Use case: ${account.useCase}`);
  console.log();

  // Dispatch command
  const action = args.action || args.params[0];

  if (!action) {
    console.log(`
Usage:
  node gmail-search-v2.js [options] <command> [args]

Options:
  --account <name>    Use specific account (default: ${accounts.DEFAULT_ACCOUNT})

Commands:
  url                 Generate OAuth authorization URL
  code <CODE>         Exchange authorization code for tokens

  search <query>      Search emails
  get <messageId>     Get full email content
  attachments <msgId> List attachments
  download <msgId> [dir] Download all attachments

  read <messageId>    Mark as read
  unread <messageId>  Mark as unread
  archive <messageId> Archive (remove from inbox)
  unarchive <messageId> Move back to inbox
  star <messageId>    Star message
  unstar <messageId>  Unstar message
  trash <messageId>   Move to trash

  labels              List custom labels
  label <msgId> <name> Add label to message
  unlabel <msgId> <name> Remove label from message
`);
    process.exit(0);
  }

  try {
    switch (action) {
      case 'url':
        console.log(`Authorization URL:\n${generateAuthUrl(selectedAccount)}\n`);
        console.log(`1. Copy the URL above\n`);
        console.log(`2. Open it in your browser\n`);
        console.log(`3. Authorize the application\n`);
        console.log(`4. Copy the authorization code\n`);
        console.log(`5. Run: node gmail-search-v2.js --account ${selectedAccount} code <CODE>\n`);
        break;

      case 'code':
        const code = args.params[0];
        if (!code) {
          console.error('Please provide the authorization code');
          console.log('Run: node gmail-search-v2.js --account ' + selectedAccount + ' code <CODE>');
          process.exit(1);
        }
        console.log(`Exchanging code for tokens for ${selectedAccount}...`);
        await exchangeCode(selectedAccount, code);
        console.log('✓ Tokens saved successfully!');
        console.log('✓ You can now use other commands with this account.\n');
        break;

      case 'search':
        const query = args.params.join(' ');
        if (!query) {
          console.error('Please provide a search query');
          process.exit(1);
        }
        await searchEmails(selectedAccount, query);
        break;

      case 'get':
        const messageId = args.params[0];
        if (!messageId) {
          console.error('Please provide a message ID');
          process.exit(1);
        }
        const message = await getMessage(selectedAccount, messageId);
        console.log(JSON.stringify(message, null, 2));
        break;

      case 'attachments':
        const attachMsgId = args.params[0];
        if (!attachMsgId) {
          console.error('Please provide a message ID');
          process.exit(1);
        }
        const attachments = await getAttachments(selectedAccount, attachMsgId);
        console.log(`\nAttachments (${attachments.length}):\n`);
        for (const att of attachments) {
          console.log(`  ${att.filename} (${att.mimeType})`);
        }
        break;

      case 'download':
        const downloadMsgId = args.params[0];
        const downloadDir = args.params[1] || '.';
        if (!downloadMsgId) {
          console.error('Please provide a message ID');
          process.exit(1);
        }
        await downloadAttachments(selectedAccount, downloadMsgId, downloadDir);
        break;

      case 'read':
      case 'unread':
      case 'archive':
      case 'unarchive':
      case 'star':
      case 'unstar':
      case 'trash':
        const msgId = args.params[0];
        if (!msgId) {
          console.error(`Please provide a message ID for ${action}`);
          process.exit(1);
        }
        await modifyMessage(selectedAccount, msgId, action);
        break;

      case 'labels':
        await getLabels(selectedAccount);
        break;

      case 'label':
        const labelMsgId = args.params[0];
        const labelName = args.params[1];
        if (!labelMsgId || !labelName) {
          console.error('Please provide message ID and label name');
          process.exit(1);
        }
        await addLabel(selectedAccount, labelMsgId, labelName);
        break;

      case 'unlabel':
        const unlabelMsgId = args.params[0];
        const unlabelName = args.params[1];
        if (!unlabelMsgId || !unlabelName) {
          console.error('Please provide message ID and label name');
          process.exit(1);
        }
        await removeLabel(selectedAccount, unlabelMsgId, unlabelName);
        break;

      default:
        console.error(`Unknown action: ${action}`);
        console.log('Use --help or check usage above');
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Run main
main();
