const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const axios = require('axios');
const WebSocket = require('ws');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');


// MongoDB connection
mongoose.connect('mongodb+srv://bitcoption:Precious1@autotrader.myq0i.mongodb.net/?retryWrites=true&w=majority&appName=autotrader')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Telegram Bot Setup
const bot = new TelegramBot('7423072615:AAE4n0XMukzbdsW_lsvhY2KcmJ2uS_RjR20', { polling: true });

app.use(express.json());
app.use(express.static('public'));

// Define User Schema for MongoDB
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  username: String,
  registrationDate: { type: Date, default: Date.now },
  solanaWallet: String, // Store Solana wallet address for each user
  privateKey: String, // Store private key for each user
  apiKey: String, // Store API key for each user
  solanaBalance: { type: Number, default: 0 } // Track balance of Solana for the user
});

// Create a model for the schema
const User = mongoose.model('User', userSchema);

const createSolanaWallet = async () => {
  try {
    // Step 1: Create a wallet
    const response = await axios.get('https://pumpportal.fun/api/create-wallet');
    console.log('API Response:', response.data); // Log the response data
    const data = response.data;
    const privateKey = data.privateKey;
    const walletAddress = data.walletPublicKey;
    const apiKey = data.apiKey;

    if (walletAddress && apiKey) {
      console.log(`Private Key: ${privateKey}`);
      console.log(`Wallet Address: ${walletAddress}`);
      console.log(`API Key: ${apiKey}`);
      return { walletAddress, privateKey, apiKey };
    } else {
      console.error('Failed to create wallet: Invalid response data');
      return null;
    }
  } catch (error) {
    console.error('Failed to create wallet:', error.response ? error.response.data : error.message);
    return null;
  }
};

// Command to handle user login (check if user exists or needs registration)
bot.onText(/\/login/, async (msg) => {
  const chatId = msg.chat.id;

  // Check if the user is already registered in MongoDB
  const user = await User.findOne({ telegramId: chatId });

  if (user) {
    // If user exists, show the main menu
    bot.sendMessage(chatId, `Welcome back, ${user.firstName}!`, {
      parse_mode: 'Markdown'
    });

    // Display menu options for the user
    const menuOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💸 Deposit', callback_data: 'deposit_solana' },
            { text: '💳 Withdrawal', callback_data: 'withdrawal' }
          ],
          [
            { text: '📈 Opened Positions', callback_data: 'opened_positions' },
            { text: '📜 History', callback_data: 'history' }
          ],
          [
            { text: '🔍 Check Balance', callback_data: 'check_balance' },
            { text: '📈 Trade', url: `https://auto-trade-production.up.railway.app?telegramId=${chatId}` } // Redirect to URL
          ]
        ]
      }
    };

    bot.sendMessage(chatId, 'Choose an action from the menu below:', menuOptions);
  } else {
    // If user doesn't exist, register them silently
    const newUser = new User({
      telegramId: chatId,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name || '',
      username: msg.from.username || ''
    });
  
    // Create a Solana wallet for the user and save the user with the wallet details
    const walletDetails = await createSolanaWallet();
    if (walletDetails) {
      const { walletAddress, privateKey, apiKey } = walletDetails;
      // Assign wallet details to newUser
      newUser.solanaWallet = walletAddress;
      newUser.privateKey = privateKey;
      newUser.apiKey = apiKey;
  
      console.log('Wallet details successfully retrieved and used.');
  
      await newUser.save()
        .then((savedUser) => {
          bot.sendMessage(chatId, `Registration successful!🎉 \n\nThank you for joining, ${query.from.first_name}! 🚀\n\nYour unique Solana wallet address is: ${savedUser.solanaWallet}`, {
            parse_mode: 'Markdown'
          });

        // Show the main menu after registration
        const menuOptions = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💸 Deposit', callback_data: 'deposit_solana' },
                { text: '💳 Withdrawal', callback_data: 'withdrawal' }
              ],
              [
                { text: '📈 Opened Positions', callback_data: 'opened_positions' },
                { text: '📜 History', callback_data: 'history' }
              ],
              [
                { text: '🔍 Check Balance', callback_data: 'check_balance' },
                { text: '📈 Trade', url: `https://auto-trade-production.up.railway.app?telegramId=${chatId}` } // Redirect to URL
              ]
            ]
          }
        };

        bot.sendMessage(chatId, 'Choose an action from the menu below:', menuOptions);
      })
      .catch(err => {
        bot.sendMessage(chatId, `⚠️ *Error during registration:*\n${err.message}`, {
          parse_mode: 'Markdown'
        });
      });
    }
  }
});

// Start command to test bot with styled login button
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔑 Login', callback_data: 'login' }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, `Welcome to the MemeTrade Bot!\n\nTo get started, click below to log in. Once logged in, you'll be ready to explore all the features of this bot! 💼\n\nLet’s make this fun! 😎`, options);
});

// Help command to show available commands
bot.onText(/\/help/, (msg) => {
  const helpMessage = `Available Commands:
/start - Start the bot and display the login button
/login - Log in or register to the platform
/menu - Show the main menu with available options
/help - Show this help message`;

  bot.sendMessage(msg.chat.id, helpMessage);
});

// Updated Menu Command with a "Check Balance" Button
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;

  const menuOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💸 Deposit', callback_data: 'deposit_solana' },
          { text: '💳 Withdrawal', callback_data: 'withdrawal' }
        ],
        [
          { text: '📈 Opened Positions', callback_data: 'opened_positions' },
          { text: '📜 History', callback_data: 'history' }
        ],
        [
          { text: '🔍 Check Balance', callback_data: 'check_balance' },
          { text: '📈 Trade', url: `https://auto-trade-production.up.railway.app?telegramId=${chatId}` } // Redirect to URL
        ]
      ]
    }
  };

  bot.sendMessage(chatId, 'Choose an action from the menu below:', menuOptions);
});

// Handle Check Balance Callback Query
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'check_balance') {
    // Fetch the user from the database
    const user = await User.findOne({ telegramId: chatId });

    if (user && user.solanaWallet) {
      try {
        const solanaWeb3 = require('@solana/web3.js');
        const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
        const publicKey = new solanaWeb3.PublicKey(user.solanaWallet);

        // Get the current balance of the user's wallet from Solana blockchain
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL; // Convert from lamports to SOL

        bot.sendMessage(chatId, `📊 Your current Solana balance is: *${solBalance.toFixed(4)} SOL*`, {
          parse_mode: 'Markdown'
        });
      } catch (err) {
        bot.sendMessage(chatId, `⚠️ Error fetching balance: ${err.message}`);
      }
    } else {
      bot.sendMessage(chatId, '⚠️ *User not found or wallet not set.*\n\nPlease log in first using the /login command.');
    }
  }
});

// Handling inline button presses
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'login') {
    // Check if the user is already registered in MongoDB
    const user = await User.findOne({ telegramId: chatId });

    if (user) {
      // If user exists, show the main menu
      bot.sendMessage(chatId, `Welcome back, ${user.firstName}!`, {
        parse_mode: 'Markdown'
      });

      // Display menu options for the user
      const menuOptions = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💸 Deposit', callback_data: 'deposit_solana' },
              { text: '💳 Withdrawal', callback_data: 'withdrawal' }
            ],
            [
              { text: '📈 Opened Positions', callback_data: 'opened_positions' },
              { text: '📜 History', callback_data: 'history' }
            ],
            [
              { text: '🔍 Check Balance', callback_data: 'check_balance' },
              { text: '📈 Trade', url: `https://auto-trade-production.up.railway.app?telegramId=${chatId}` } // Redirect to URL
            ]
          ]
        }
      };

      bot.sendMessage(chatId, 'Choose an action from the menu below:', menuOptions);
    } else {
      // If user doesn't exist, register them silently
      const newUser = new User({
        telegramId: chatId,
        firstName: query.from.first_name,
        lastName: query.from.last_name || '',
        username: query.from.username || ''
      });
    
      // Create a Solana wallet for the user and save the user with the wallet details
      const walletDetails = await createSolanaWallet();
      if (walletDetails) {
        const { walletAddress, privateKey, apiKey } = walletDetails;
        // Assign wallet details to newUser
        newUser.solanaWallet = walletAddress;
        newUser.privateKey = privateKey;
        newUser.apiKey = apiKey;
    
        console.log('Wallet details successfully retrieved and used.');
    
        await newUser.save()
          .then((savedUser) => {
            bot.sendMessage(chatId, `Registration successful!🎉 \n\nThank you for joining, ${query.from.first_name}! 🚀\n\nYour unique Solana wallet address is: ${savedUser.solanaWallet}`, {
              parse_mode: 'Markdown'
            });

          // Show the main menu after registration
            const menuOptions = {
            reply_markup: {
              inline_keyboard: [
              [
                { text: '💸 Deposit', callback_data: 'deposit_solana' },
                { text: '💳 Withdrawal', callback_data: 'withdrawal' }
              ],
              [
                { text: '📈 Opened Positions', callback_data: 'opened_positions' },
                { text: '📜 History', callback_data: 'history' }
              ],
              [
                { text: '🔍 Check Balance', callback_data: 'check_balance' },
                { text: '📈 Trade', url: `https://auto-trade-production.up.railway.app?telegramId=${chatId}` } // Redirect to URL
              ]
              ]
            }
            };

          bot.sendMessage(chatId, 'Choose an action from the menu below:', menuOptions);
        })
        .catch(err => {
          bot.sendMessage(chatId, `⚠️ *Error during registration:*\n${err.message}`, {
            parse_mode: 'Markdown'
          });
        });
      }
    }
  }
  // Handling menu options
  if (query.data === 'buy_token') {
    bot.sendMessage(chatId, '📈 *Buying token...*\n\nYou are about to purchase a token at 99% or 98% bonding curve, just before migration to Raydium. Please wait...');
    // Implement API logic here to buy the token using Bitquery and Jupiter API
    // e.g., axios calls to Jupiter API to perform the trade
  }

  if (query.data === 'monitor_market_cap') {
    bot.sendMessage(chatId, '📊 *Monitoring Market Cap...*\n\nI will track the market cap in real-time. You will be alerted if it drops below your set threshold.');
    // Implement logic to fetch market cap from CoinGecko API
  }

  if (query.data === 'sell_token') {
    bot.sendMessage(chatId, '⚖️ *Selling token...*\n\nThe market cap has dropped below your set threshold. The bot is selling your token to prevent losses. You can adjust the threshold if you believe the token will recover.');
    // Implement logic to sell token (e.g., stop-loss with Jupiter API)
  }

  if (query.data === 'deposit_solana') {
    // Fetch the user to get their Solana wallet address
    const user = await User.findOne({ telegramId: chatId });
  
    if (user) {
      bot.sendMessage(chatId, `💸 *Deposit Solana...*\n\nPlease send Solana to the following wallet address:\n\n${user.solanaWallet}`);
  
      bot.once('message', async (msg) => {
        // Assume the message contains the deposit amount as a string
        const depositAmount = parseFloat(msg.text);
  
        if (isNaN(depositAmount) || depositAmount <= 0) {
          bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a valid Solana deposit amount.');
        } else {
          // Update user's Solana balance
          user.solanaBalance += depositAmount;
          await user.save();
  
          bot.sendMessage(chatId, `💰 Solana Deposit of ${depositAmount} SOL confirmed! Your new balance is ${user.solanaBalance} SOL.`);
        }
      });
    } else {
      bot.sendMessage(chatId, '⚠️ *User not found.*\n\nPlease log in first using the /login command.');
    }
  } 

  if (query.data === 'withdrawal') {
    const user = await User.findOne({ telegramId: chatId });

    if (user) {
      bot.sendMessage(chatId, '💳 *Withdrawal Solana...*\n\nPlease enter the amount of Solana you wish to withdraw:');

      bot.once('message', async (msg) => {
        const withdrawalAmount = parseFloat(msg.text);

        if (isNaN(withdrawalAmount)) {
          bot.sendMessage(chatId, '⚠️ Invalid amount. Please enter a valid Solana withdrawal amount.');
        } else if (withdrawalAmount > user.solanaBalance) {
          bot.sendMessage(chatId, `⚠️ Insufficient Balance: Your withdrawal amount exceeds your current Solana balance. Your balance is ${user.solanaBalance} SOL.`);
        } else {
          bot.sendMessage(chatId, '💳 *Withdrawal Solana...*\n\nPlease enter the wallet address to withdraw to:');

          bot.once('message', async (msg) => {
            const recipientWallet = msg.text;

            try {
              const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'), 'confirmed');
              const fromPublicKey = new solanaWeb3.PublicKey(user.solanaWallet);
              const toPublicKey = new solanaWeb3.PublicKey(recipientWallet);

              // Create a transaction to transfer Solana
              const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                  fromPubkey: fromPublicKey,
                  toPubkey: toPublicKey,
                  lamports: withdrawalAmount * solanaWeb3.LAMPORTS_PER_SOL,
                })
              );

              // Sign the transaction
              const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [YOUR_SIGNER]); // Replace YOUR_SIGNER with the actual signer

              // Update user's Solana balance
              user.solanaBalance -= withdrawalAmount;
              await user.save();

              bot.sendMessage(chatId, `💳 Solana Withdrawal of ${withdrawalAmount} SOL confirmed! Your new balance is ${user.solanaBalance} SOL.\nTransaction Signature: ${signature}`);
            } catch (error) {
              bot.sendMessage(chatId, `⚠️ Withdrawal failed: ${error.message}`);
            }
          });
        }
      });
    } else {
      bot.sendMessage(chatId, '⚠️ *User not found.*\n\nPlease log in first using the /login command.');
    }
  } 
});

app.get('/api/authenticate/:telegramId', async (req, res) => {
  const { telegramId } = req.params;
  const user = await User.findOne({ telegramId });

  if (user) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

const request = require("request");

app.use(bodyParser.json());

let tokens = [];

// Bitquery API request options
const options = {
  method: "POST",
  url: "https://streaming.bitquery.io/eap",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer ory_at_ES3V8WqpOjGsr6hAc54V-WTE-mKjvajBWuX8hhqJiWg.AU-UGWcDcME8mEhFsTartaMAORq5Lkib4A3eKs6fzSM",
  },
  body: JSON.stringify({
    query: 'subscription MyQuery {\n  Solana {\n    DEXPools(\n      where: {Pool: {Base: {PostAmount: {gt: \"206900000\", lt: \"246555000\"}}, Dex: {ProgramAddress: {is: \"6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P\"}}, Market: {QuoteCurrency: {MintAddress: {is: \"11111111111111111111111111111111\"}}}}, Transaction: {Result: {Success: true}}}\n    ) {\n      Pool {\n        Market {\n          BaseCurrency {\n            MintAddress\n            Name\n            Symbol\n          }\n          MarketAddress\n          QuoteCurrency {\n            MintAddress\n            Name\n            Symbol\n          }\n        }\n        Dex {\n          ProtocolName\n          ProtocolFamily\n        }\n        Base {\n          Balance: PostAmount\n          Marketcap: PostAmountInUSD\n          PriceInUSD\n        }\n        Quote {\n          PostAmountInUSD\n        }\n      }\n    }\n    DEXTrades {\n      Trade {\n        Buy {\n          Currency {\n            Uri\n          }\n          PriceInUSD\n        }\n      }\n    }\n  }\n}\n',
    variables: "{}",
  }),
};

request(options, function (error, response) {
  if (error) throw new Error(error);

  try {
    var responseBody = JSON.parse(response.body);

    var pools = responseBody?.data?.Solana?.DEXPools || [];
    var trades = responseBody?.data?.Solana?.DEXTrades || [];

    tokens = pools.map((pool, index) => {
      const base = pool?.Pool?.Market?.BaseCurrency || {};
      const quote = pool?.Pool?.Market?.QuoteCurrency || {};
      const marketcap = pool?.Pool?.Base?.PriceInUSD * 1000000000 || "N/A";
      const priceUSD = pool?.Pool?.Base?.PriceInUSD || "N/A";
      const balance = pool?.Pool?.Base?.Balance ?? 0; // Ensure it's a number
      const trade = trades[index]?.Trade?.Buy || {};
      const uri = trade?.Currency?.Uri || "N/A";
      const priceUSD2 = trade?.PriceInUSD || "N/A";

      // Calculate bonding curve safely
      const bondingcurve = balance > 0
        ? (100 - ((balance - 206900000) * 100) / 793100000).toFixed(4)
        : "N/A";

      const dexName = pool?.Pool?.Dex?.ProtocolName || "Unknown DEX";

      console.log(`--- Token Update #${index + 1} ---`);
      console.log(`DEX: ${dexName}`);
      console.log(`Token: ${base?.Name || "Unknown"} (${base?.Symbol || "N/A"})`);
      console.log(`Mint Address: ${base?.MintAddress || "N/A"}`);
      console.log(`Price: $${priceUSD !== "N/A" ? parseFloat(priceUSD).toFixed(10) : "N/A"}`);
      console.log(`Market Cap: $${marketcap !== "N/A" ? parseFloat(marketcap).toLocaleString() : "N/A"}`);
      console.log(`Bonding Curve: ${bondingcurve}%`);
      console.log(`Price USD2: $${priceUSD2 !== "N/A" ? parseFloat(priceUSD2).toFixed(10) : "N/A"}`);
      console.log(`URI: ${uri}`);
      console.log(`Pair: ${base?.Symbol || "N/A"} / ${quote?.Symbol || "N/A"}`);
      console.log("--------------------------------\n");

      return {
        dexName,
        tokenName: base?.Name || "Unknown",
        tokenSymbol: base?.Symbol || "N/A",
        mintAddress: base?.MintAddress || "N/A",
        priceUSD: priceUSD !== "N/A" ? parseFloat(priceUSD).toFixed(10) : "N/A",
        marketcap: marketcap !== "N/A" ? parseFloat(marketcap).toLocaleString() : "N/A",
        bondingcurve,
        priceUSD2: priceUSD2 !== "N/A" ? parseFloat(priceUSD2).toFixed(10) : "N/A",
        uri,
        pair: `${base?.Symbol || "N/A"} / ${quote?.Symbol || "N/A"}`
      };
    });
  } catch (e) {
    console.error("Failed to parse response body: ", e);
  }
});

app.get('/api/tokens', (req, res) => {
  res.json(tokens);
});

// Express route to handle the buy token request
app.post('/api/buy', async (req, res) => {
  const { telegramId, mint } = req.body;
  const user = await User.findOne({ telegramId });

  if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
  }

  // Example check for minimum required balance to make a purchase
  const amountToPurchase = 0.001;
  if (user.solanaBalance < amountToPurchase) {
      return res.status(400).json({ success: false, message: 'Insufficient funds' });
  }

  try {
      const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${user.apiKey}`, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              "action": "buy",
              "mint": mint,
              "amount": amountToPurchase,
              "denominatedInSol": true,
              "slippage": 10,
              "priorityFee": 0.005,
              "pool": "pump"
          })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          return res.status(response.status).json({ success: false, message: data.message || 'Failed to buy token' });
      }

      // Deduct the purchased amount from user's balance
      user.solanaBalance -= amountToPurchase;
      await user.save();

      res.json({ success: true, data });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ success: false, message: 'Failed to buy token', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});