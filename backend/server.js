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
const pool = new pg.Pool({
  user: env.user,
  host: env.host,
  database: env.database,
  password: env.password,
  port: env.port,
});

pool.connect()
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
      client_user_id: "unique_user_id",
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
    start_date: '2023-01-01',
    end_date: '2023-12-31',
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
app.post("/api/transactions/create", (req, res) => {
  const { date, amount, category, primary_category, detailed_category } = req.body;

  pool.query(
    "INSERT INTO transactions (date, amount, category, primary_category, detailed_category) VALUES ($1, $2, $3) RETURNING *",
    [date, amount, category, primary_category, detailed_category]
  )
    .then((result) => {
      res.status(201).json(result.rows[0]);
    })
    .catch((error) => {
      console.error("Error inserting transaction:", error);
      res.status(500).send("Error creating transaction");
    });
});

// Fetch all transactions
app.get("/api/transactions", (req, res) => {
  pool.query("SELECT * FROM transactions ORDER BY date DESC")
    .then((result) => {
      res.json(result.rows);
    })
    .catch((error) => {
      console.error("Error fetching transactions:", error);
      res.status(500).send("Error fetching transactions");
    });
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
