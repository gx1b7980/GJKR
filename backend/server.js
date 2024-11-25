const express = require("express");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const session = require("express-session");
const app = express();
const pg = require("pg");
const path = require('path');

const port = 3000;
const hostname = "localhost";

// Create API keys from Plaid and add them to env.json as client_IDKey and secretKey
// Load API keys from the env.json file
const env = require("../server/env.json");
let client_IDKey = env["client_IDKey"];
let secretKey = env["secretKey"];

// Database connection setup using the env.json file
// Make sure to include postgres information in env.json
const db = new pg.Pool({
  user: env.user,
  host: env.host,
  database: env.database,
  password: env.password,
  port: env.port,
});

db.connect()
  .then(() => console.log(`Connected to database ${env.database}`))
  .catch((err) => console.error("Error connecting to database:", err));

app.use(express.static("public"));
app.use(express.json());

// Express-session middleware to handle sessions
app.use(session({
  secret: 'Secret_key_session',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

// Set up Plaid client library
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox, // Sandbox is used here to pull from sandbox test data
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": client_IDKey,
      "PLAID-SECRET": secretKey,
      "Plaid-Version": "2020-09-14",
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);


app.use(express.static(path.join(__dirname, '../frontend')));
// Route to serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Route to create a link token
app.post("/api/create_link_token", (req, res) => {
  plaidClient.linkTokenCreate({
    user: {
      client_user_id: "user_transactions_dynamic",
    },
    client_name: "Your App Name",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  })
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      console.error("Error creating link token:", error);
      res.status(500).send("Error creating link token");
    });
});

// Exchange public token for access token and store it in the session
app.post("/api/exchange_public_token", (req, res) => {
  const { public_token } = req.body;
  plaidClient.itemPublicTokenExchange({ public_token })
    .then(response => {

      // Store the access token in the session for the current test user
      req.session.access_token = response.data.access_token;
      res.json({ access_token: response.data.access_token });
    })
    .catch(error => {
      console.error("Error exchanging public token:", error);
      res.status(500).send("Error exchanging public token");
    });
});

// Fetch balance information 
app.get("/api/data", (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.status(400).json({ error: "No access token found" });
  }

  plaidClient.accountsBalanceGet({ access_token })
    .then(balanceResponse => {
      res.json({ balance: balanceResponse.data });
    })
    .catch(error => {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: error.message });
    });
});

// Fetch transactions
app.post("/api/transactions/sync", (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.status(400).json({ error: "No access token found" });
  }

  plaidClient.transactionsGet({
    access_token,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    options: { include_personal_finance_category: true },
  })
    .then(response => {
      res.json({ transactions: response.data.transactions });
    })
    .catch(error => {
      console.error("Error loading transactions:", error);
      res.status(500).json({ error: error.message });
    });
});

// Fetch account information
app.get("/api/accounts", (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.status(400).json({ error: "No access token found" });
  }

  plaidClient.accountsGet({ access_token })
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      console.error("Error fetching account data:", error);
      res.status(500).json({ error: error.message });
    });
});

// Fetch identity information
app.get("/api/identity", (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.status(400).json({ error: "No access token found" });
  }

  plaidClient.identityGet({ access_token })
    .then(response => {
      res.json(response.data);
    })
    .catch(error => {
      console.error("Error fetching identity data:", error);
      res.status(500).json({ error: error.message });
    });
});

// Create a new transaction
app.post('/api/transactions/create', async (req, res) => {
  try {
    const { date, amount, category } = req.body;

    const categoryResult = await db.query(
      'SELECT primary_category, detailed_category FROM categories WHERE name = $1',
      [category]
    );
    if (categoryResult.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const { primary_category, detailed_category } = categoryResult.rows[0];

    await db.query(
      'INSERT INTO transactions (date, amount, category, primary_category, detailed_category) VALUES ($1, $2, $3, $4, $5)',
      [date, amount, category, primary_category, detailed_category]
    );

    res.status(201).json({ message: 'Transaction created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Fetch all transactions
app.get("/api/transactions", (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY date DESC")
    .then((result) => {
      res.json(result.rows);
    })
    .catch((error) => {
      console.error("Error fetching transactions:", error);
      res.status(500).send("Error fetching transactions");
    });
});

app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if username already exists
    const userExists = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    // Set session
    req.session.userId = result.rows[0].id;
    req.session.username = result.rows[0].username;

    res.status(201).json({
      message: "User created successfully",
      user: { id: result.rows[0].id, username: result.rows[0].username }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user
    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const user = result.rows[0];

    // Check password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      message: "Login successful",
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: "Error logging in" });
  }
});

// Logout route
app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user route
app.get("/api/user", (req, res) => {
  if (req.session.userId) {
    res.json({
      isLoggedIn: true,
      user: {
        id: req.session.userId,
        username: req.session.username
      }
    });
  } else {
    res.json({
      isLoggedIn: false
    });
  }
});

app.get("/api/transactions", (req, res) => {
  db.query("SELECT * FROM transactions ORDER BY date DESC")
    .then((transactionsResult) => {
      const transactions = transactionsResult.rows;

      return db.query("SELECT category, target_amount FROM financial_targets")
        .then((targetsResult) => {
          const targets = targetsResult.rows;

          // Calculate the total spending for each category
          const categoryTotals = {};
          transactions.forEach((transaction) => {
            const category = transaction.category;
            if (!categoryTotals[category]) {
              categoryTotals[category] = 0;
            }
            categoryTotals[category] += parseFloat(transaction.amount);
          });

          // Find out which categories go over their budget targets
          const categoryStatus = targets.map((target) => {
            const totalSpent = categoryTotals[target.category] || 0;
            return {
              category: target.category,
              totalSpent: totalSpent,
              targetAmount: parseFloat(target.target_amount),
              overLimit: totalSpent > parseFloat(target.target_amount),
            };
          });

          res.json({ transactions, categoryStatus });
        });
    })
    .catch((error) => {
      console.error("Error fetching transactions or financial targets:", error);
      res.status(500).send("Internal Server Error");
    });
});

// Fetch combined transactions (Plaid + Manual)
app.get("/api/transactions/all", async (req, res) => {
  try {
    
    // Fetch Plaid transactions
    const access_token = req.session.access_token;
    let plaidTransactions = [];
    if (access_token) {
      const plaidResponse = await plaidClient.transactionsGet({
        access_token,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
      });
      plaidTransactions = plaidResponse.data.transactions;
    }

    // Fetch manual transactions from the database
    const manualTransactionsResult = await db.query("SELECT * FROM transactions ORDER BY date DESC");
    const manualTransactions = manualTransactionsResult.rows;

    const combinedTransactions = [...plaidTransactions, ...manualTransactions];
    res.json({ transactions: combinedTransactions });
  } catch (error) {
    console.error("Error fetching combined transactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route to get all financial targets
app.get('/api/financial-targets', (req, res) => {
  db.query('SELECT category, target_amount FROM financial_targets')
    .then(result => {
      const financialTargets = result.rows.reduce((acc, row) => {
        acc[row.category] = row.target_amount;
        return acc;
      }, {});
      res.json(financialTargets);
    })
    .catch(error => {
      console.error("Error fetching financial targets:", error);
      res.status(500).json({ error: "Failed to fetch financial targets" });
    });
});

// Route to set financial targets
app.post('/api/financial-targets/set', (req, res) => {
  const { category, targetAmount } = req.body;
  const query = 'INSERT INTO financial_targets (category, target_amount) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET target_amount = $2';
  
  db.query(query, [category, targetAmount], (err, result) => {
    if (err) {
      console.error('Error setting financial target:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.status(200).send('Target set successfully');
  });
});

// Route to get the financial target for a specific category
app.get('/api/financial-targets/:category', (req, res) => {
  const category = req.params.category;
  const query = 'SELECT target_amount FROM financial_targets WHERE category = $1';

  db.query(query, [category], (err, result) => {
    if (err || result.rows.length === 0) {
      return res.status(404).send('Target not found');
    }
    res.status(200).json(result.rows[0]);
  });
});


// Route to remove a financial target
app.post('/api/financial-targets/remove', (req, res) => {
  const { category } = req.body;

  if (!category) {
    return res.status(400).send('Category is required');
  }

  const query = 'DELETE FROM financial_targets WHERE category = $1';

  db.query(query, [category], (err, result) => {
    if (err) {
      console.error('Error removing financial target:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.status(200).send('Target removed successfully');
  });
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
