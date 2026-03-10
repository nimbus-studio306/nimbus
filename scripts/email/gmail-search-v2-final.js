// Account management functions

// Add a new Gmail account
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

// Exchange authorization code for tokens
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

// Remove account (delete tokens)
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

// List all configured accounts
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
