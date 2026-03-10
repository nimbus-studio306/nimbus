/**
 * Gmail Account Configuration
 *
 * Defines all configured Gmail accounts with their profiles.
 * This file is included in gmail-search-v2.js.
 */

const ACCOUNTS = {
  'papperpictures': {
    'email': 'papperpictures@gmail.com',
    'name': 'Papper Pictures',
    'signingName': 'Papper Pictures',
    'signature': 'Best regards,\nPapper Pictures\nhttps://papperpictures.nl',
    'tone': 'professional',
    'useCase': 'personal photography business',
    'priority': 1,
    'domains': ['papperpictures.nl', 'papperpictures.com'],
    'aliases': ['personal', 'papi', 'me']
  },
  'urbandanceteam': {
    'email': 'urbandanceteam@gmail.com',
    'name': 'Urban Dance Team',
    'signingName': 'Urban Dance Team',
    'signature': 'Best regards,\nUrban Dance Team\nhttps://urban-dance-hungary.hu',
    'tone': 'enthusiastic',
    'useCase': 'urban dance events and workshops',
    'priority': 2,
    'domains': ['urban-dance-hungary.hu', 'udh-events.hu'],
    'aliases': ['dance', 'udh', 'dance-team']
  },
  'studio306nl': {
    'email': 'studio306nl@gmail.com',
    'name': 'Studio 306',
    'signingName': 'Studio 306',
    'signature': 'Best regards,\nStudio 306\nHuismanstraat 30, 3082 HK Rotterdam\nhttps://studio306.nl',
    'tone': 'professional',
    'useCase': 'personal studio operations',
    'priority': 3,
    'domains': ['studio306.nl'],
    'aliases': ['studio', 'my-studio', '306']
  },
  'funkin4holland': {
    'email': 'funkin4holland@gmail.com',
    'name': 'Funkin\' 4 Holland',
    'signingName': 'Funkin\' 4 Holland',
    'signature': 'Best regards,\nFunkin\' 4 Holland\nhttps://funkin4.nl',
    'tone': 'energetic',
    'useCase': 'Dutch dance events',
    'priority': 4,
    'domains': ['funkin4.nl'],
    'aliases': ['funkin', 'holland', 'events']
  },
  'c3studios': {
    'email': 'c3studios.nl@gmail.com',
    'name': 'C3 Studios',
    'signingName': 'C3 Studios',
    'signature': 'Best regards,\nC3 Studios\nHuismanstraat 30, 3082 HK Rotterdam\nhttps://c3studios.nl',
    'tone': 'professional',
    'useCase': 'C3 Studios partnership communications',
    'priority': 5,
    'domains': ['c3studios.nl'],
    'aliases': ['c3', 'c3studios']
  }
};

// Default account
const DEFAULT_ACCOUNT = 'papperpictures';

/**
 * Get account config by name
 */
function getAccount(name) {
  if (!ACCOUNTS[name]) {
    throw new Error(`Account not found: ${name}. Available accounts: ${Object.keys(ACCOUNTS).join(', ')}`);
  }
  return ACCOUNTS[name];
}

/**
 * Get account by alias or exact name
 */
function getAccountByAlias(lookup) {
  // First try exact match
  if (ACCOUNTS[lookup]) {
    return ACCOUNTS[lookup];
  }

  // Then try alias lookup
  for (const [name, account] of Object.entries(ACCOUNTS)) {
    if (account.aliases && account.aliases.includes(lookup)) {
      return account;
    }
  }

  throw new Error(`Account "${lookup}" not found. Available accounts: ${Object.keys(ACCOUNTS).join(', ')}`);
}

/**
 * List all configured accounts
 */
function listAccounts() {
  const accounts = [];
  for (const [name, config] of Object.entries(ACCOUNTS)) {
    accounts.push({
      name,
      ...config
    });
  }
  return accounts;
}

/**
 * Get account priority rank
 */
function getAccountPriority(name) {
  const account = getAccount(name);
  return account.priority;
}

/**
 * Get the highest priority account (closest to 1)
 */
function getHighestPriorityAccount() {
  let highestPriority = Infinity;
  let highestAccount = null;

  for (const [name, account] of Object.entries(ACCOUNTS)) {
    if (account.priority < highestPriority) {
      highestPriority = account.priority;
      highestAccount = name;
    }
  }

  return highestAccount;
}

module.exports = {
  ACCOUNTS,
  DEFAULT_ACCOUNT,
  getAccount,
  getAccountByAlias,
  listAccounts,
  getAccountPriority,
  getHighestPriorityAccount
};
