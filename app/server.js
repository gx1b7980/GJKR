let express = require("express");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
let { Pool } = require("pg");
const session = require("express-session");
const pg = require("pg");
const path = require("path");
const bcrypt = require('bcrypt');


process.chdir(__dirname);

let port = 3000;
let host;
let databaseConfig;

// Load environment variables

if (process.env.NODE_ENV == "production") {
	host = "0.0.0.0";
	databaseConfig = { connectionString: process.env.DATABASE_URL };
} else {
	host = "localhost";
	let { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT } = process.env;
	databaseConfig = { PGUSER, PGPASSWORD, PGDATABASE, PGHOST, PGPORT };
}

console.log("********");
console.log(databaseConfig);
console.log(JSON.stringify(databaseConfig, null, 2));
console.log("********");
const saltRounds = 10;

// Middleware setup 
let app = express();
app.use(express.json());
app.use(express.static("frontend"));

app.use(
	session({
	  secret: "Secret_key_session",
	  resave: false,
	  saveUninitialized: true,
	  cookie: { secure: false },
	})
  );

// Load environment variables
// const env = require("../server/env.json");
let client_IDKey = "67573156c418ad001a745624"
let secretKey = "3e3f7e18000dfd058515482e35a91e"

/*
// Database connection setup
const db = new pg.Pool({
  user: env.user,
  host: env.host,
  database: env.database,
  password: env.password,
  port: env.port,
});
*/

let db = new Pool(databaseConfig);
db.connect().then(() => {
	console.log("Connected to db");
});

/*
db.connect()
  .then(() => console.log(`Connected to database ${env.database}`))
  .catch((err) => console.error("Error connecting to database:", err));

*/

 
// Plaid configuration
let plaidConfig = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": client_IDKey,
      "PLAID-SECRET": secretKey,
      "Plaid-Version": "2020-09-14",
    },
  },
});
const plaidClient = new PlaidApi(plaidConfig);

//console.log("********");
//console.log(JSON.stringify(process.env, null, 2));
//console.log("********");

// Serve static files
// app.use(express.static(path.join(__dirname, "../frontend")));

// 21. Route to serve index.html
/*app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});*/

// *********
// Plaid API Integration
// *********

// 1. Create a link token
app.post("/api/create_link_token", (req, res) => {
	plaidClient
	  .linkTokenCreate({
		user: { client_user_id: "user_transactions_dynamic" },
		client_name: "Your App Name",
		products: ["transactions"],
		country_codes: ["US"],
		language: "en",
	  })
	  .then((response) => res.json(response.data))
	  .catch((error) => {
		console.error("Error creating link token:", error);
		res.status(500).send("Error creating link token");
	  });
  });
  
// 2. Exchange public token for access token
app.post("/api/exchange_public_token", (req, res) => {
	const { public_token } = req.body;
	plaidClient
	  .itemPublicTokenExchange({ public_token })
	  .then((response) => {
		req.session.access_token = response.data.access_token;
		res.json({ access_token: response.data.access_token });
	  })
	  .catch((error) => {
		console.error("Error exchanging public token:", error);
		res.status(500).send("Error exchanging public token");
	  });
  });


// *********
// Transaction Management
// *********

// 3. Sync Plaid transactions
app.post("/api/transactions/sync", (req, res) => {
	const access_token = req.session.access_token;
	if (!access_token) {
	  return res.status(400).json({ error: "No access token found" });
	}
  
	plaidClient
	  .transactionsGet({
		access_token,
		start_date: "2024-01-01",
		end_date: "2024-12-31",
		options: { include_personal_finance_category: true },
	  })
	  .then((response) => res.json({ transactions: response.data.transactions }))
	  .catch((error) => {
		console.error("Error loading transactions:", error);
		res.status(500).json({ error: error.message });
	  });
  });
  
// 4. Create a manual transaction
app.post("/api/transactions/create", async (req, res) => {
	try {
		const { date, amount, category } = req.body;

		const categoryResult = await db.query(
		"SELECT primary_category, detailed_category FROM categories WHERE name = $1",
		[category]
		);

		if (categoryResult.rowCount === 0) {
		return res.status(400).json({ error: "Invalid category" });
		}

		const { primary_category, detailed_category } = categoryResult.rows[0];

		await db.query(
		"INSERT INTO transactions (date, amount, category, primary_category, detailed_category) VALUES ($1, $2, $3, $4, $5)",
		[date, amount, category, primary_category, detailed_category]
		);

		res.status(201).json({ message: "Transaction created successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Failed to create transaction" });
	}
	});
  
// 5. Save Plaid transactions to the database
app.post("/api/transactions/plaid", async (req, res) => {
	try {
	  const { transactions } = req.body;
  
	  for (let transaction of transactions) {
		const { date, amount, category, source = "plaid" } = transaction;
		const normalizedDate = date.slice(0, 10);
		const roundedAmount = Math.floor(amount * 100) / 100;
  
		const existingTransactionResult = await db.query(
		  "SELECT * FROM transactions WHERE DATE(date) = $1 AND amount = $2 AND category = $3",
		  [normalizedDate, roundedAmount, category]
		);
  
		if (existingTransactionResult.rowCount > 0) {
		  continue;
		}
  
		const categoryResult = await db.query(
		  "SELECT primary_category, detailed_category FROM categories WHERE name = $1",
		  [category]
		);
  
		if (categoryResult.rowCount === 0) {
		  return res.status(400).json({ error: "Invalid category" });
		}
  
		const { primary_category, detailed_category } = categoryResult.rows[0];
  
		await db.query(
		  "INSERT INTO transactions (date, amount, category, primary_category, detailed_category, source) VALUES ($1, $2, $3, $4, $5, $6)",
		  [normalizedDate, roundedAmount, category, primary_category, detailed_category, source]
		);
	  }
  
	  res.status(201).json({ message: "Plaid transactions saved successfully" });
	} catch (error) {
	  console.error(error);
	  res.status(500).json({ error: "Failed to save Plaid transactions" });
	}
  });

// 6. Delete a transaction
app.delete('/api/transactions/:id', (req, res) => {
	const transactionId = req.params.id;
  
	db.query('DELETE FROM transactions WHERE id = $1', [transactionId], (err, result) => {
	  if (err) {
		console.error("Error deleting transaction:", err);
		return res.status(500).json({ error: "Failed to delete transaction" });
	  }
	  res.status(200).json({ message: "Transaction deleted successfully" });
	});
  });
  
  
// 7. Detailed Financial Target Analysis 
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

// *********
// Fetching Transactions
// *********
// 8. Fetch all transactions
app.get("/api/transactions", (req, res) => {
	db.query("SELECT * FROM transactions ORDER BY date DESC")
	  .then((result) => res.json(result.rows))
	  .catch((error) => {
		console.error("Error fetching transactions:", error);
		res.status(500).send("Error fetching transactions");
	  });
  });

// 23. Fetch all categories
app.get("/api/categories", async (req, res) => {
	try {
	  const categories = await db.query("SELECT * FROM categories");
	  res.json(categories.rows);
	} catch (error) {
	  console.error("Error fetching categories:", error);
	  res.status(500).json({ error: "Failed to fetch categories." });
	}
  });

// 10. Fetch combined transactions (Plaid + Manual)
app.get("/api/transactions/all", async (req, res) => {
	try {
	  // Fetch Plaid transactions
	  const access_token = req.session.access_token;
	  let plaidTransactions = [];
	  if (access_token) {
		const plaidResponse = await plaidClient.transactionsGet({
		  access_token,
		  start_date: "2024-01-01",
		  end_date: "2024-12-31",
		});
		plaidTransactions = plaidResponse.data.transactions;
	  }
  
	  // Fetch manual transactions from the database
	  const manualTransactionsResult = await db.query(
		"SELECT * FROM transactions ORDER BY date DESC"
	  );
	  const manualTransactions = manualTransactionsResult.rows;
  
	  // Combine transactions
	  const combinedTransactions = [...plaidTransactions, ...manualTransactions];
	  res.json({ transactions: combinedTransactions });
	} catch (error) {
	  console.error("Error fetching combined transactions:", error);
	  res.status(500).json({ error: error.message });
	}
  });

// 11. Fetch combined transactions (linked and unlinked)
app.get("/api/transactions/combined", async (req, res) => {
	try {
	  const result = await db.query(
		"SELECT * FROM transactions ORDER BY linked_with_plaid DESC, date DESC"
	  );
	  const linkedTransactions = result.rows.filter((t) => t.linked_with_plaid);
	  const unlinkedTransactions = result.rows.filter((t) => !t.linked_with_plaid);
  
	  res.status(200).json({
		linkedTransactions,
		unlinkedTransactions,
	  });
	} catch (error) {
	  console.error("Error fetching combined transactions:", error);
	  res.status(500).send("Internal server error.");
	}
  });

// *********
// Linking/Unlinking Transactions
// *********

// 9. Link a transaction
app.post("/api/transactions/link/:id", async (req, res) => {
	const transactionId = req.params.id;
  
	try {
	  const result = await db.query(
		"UPDATE transactions SET linked_with_plaid = TRUE WHERE id = $1 RETURNING *",
		[transactionId]
	  );
  
	  if (result.rowCount > 0) {
		res.status(200).send("Transaction linked successfully.");
	  } else {
		res.status(404).send("Transaction not found.");
	  }
	} catch (error) {
	  console.error("Error linking transaction:", error);
	  res.status(500).send("Internal server error.");
	}
  });
// 12. Unlink a transaction
app.post("/api/transactions/unlink/:transactionId", async (req, res) => {
	try {
	  const { transactionId } = req.params;
  
	  const transactionResult = await db.query(
		"SELECT * FROM transactions WHERE id = $1",
		[transactionId]
	  );
  
	  if (transactionResult.rowCount === 0) {
		return res.status(404).json({ error: "Transaction not found" });
	  }
  
	  const transaction = transactionResult.rows[0];
  
	  if (transaction.source === "plaid") {
		return res
		  .status(400)
		  .json({ error: "This transaction cannot be unlinked as it is linked with Plaid." });
	  }
  
	  await db.query(
		"UPDATE transactions SET linked_with_plaid = $1 WHERE id = $2",
		[false, transactionId]
	  );
  
	  res.status(200).json({ message: "Transaction successfully unlinked." });
	} catch (error) {
	  res.status(500).json({ error: "Failed to unlink transaction." });
	}
  });

// 13. Auto-link Plaid transactions with manual ones
app.post("/api/transactions/auto-link", async (req, res) => {
	try {
	  // Fetch Plaid transactions
	  const access_token = req.session.access_token;
	  let plaidTransactions = [];
	  if (access_token) {
		const plaidResponse = await plaidClient.transactionsGet({
		  access_token,
		  start_date: "2024-01-01",
		  end_date: "2024-12-31",
		});
		plaidTransactions = plaidResponse.data.transactions;
	  }
  
	  // Loop through each Plaid transaction
	  for (const plaidTransaction of plaidTransactions) {
		const { date, amount } = plaidTransaction;
  
		const roundedPlaidAmount = Math.floor(amount * 100) / 100;
  
		const manualTransactionsResult = await db.query(
		  "SELECT * FROM transactions WHERE DATE(date) = $1 ORDER BY date DESC",
		  [date.slice(0, 10)]
		);
		const manualTransactions = manualTransactionsResult.rows;
  
		// Compare Plaid transactions with manual ones
		for (const manualTransaction of manualTransactions) {
		  const manualDate = manualTransaction.date.toISOString().slice(0, 10);
		  const roundedManualAmount = Math.floor(manualTransaction.amount * 100) / 100;
  
		  // Check if there's a matching transaction in the manual transactions
		  if (manualDate === date.slice(0, 10) && roundedManualAmount === roundedPlaidAmount) {
			// Update the manual transaction to be linked with Plaid
			await db.query(
			  "UPDATE transactions SET linked_with_plaid = TRUE WHERE id = $1",
			  [manualTransaction.id]
			);
		  }
		}
	  }
  
	  const updatedTransactionsResult = await db.query(
		"SELECT * FROM transactions ORDER BY date DESC"
	  );
	  const updatedTransactions = updatedTransactionsResult.rows;
  
	  res.json({
		transactions: updatedTransactions,
	  });
	} catch (error) {
	  console.error("Error linking transactions:", error);
	  res.status(500).send("Internal server error.");
	}
  });
  
// *********
// Financial Targets
// *********

// 14. Get all financial targets
app.get("/api/financial-targets", (req, res) => {
	db.query("SELECT category, target_amount FROM financial_targets")
	  .then((result) => {
		const financialTargets = result.rows.reduce((acc, row) => {
		  acc[row.category] = row.target_amount;
		  return acc;
		}, {});
		res.json(financialTargets);
	  })
	  .catch((error) => {
		console.error("Error fetching financial targets:", error);
		res.status(500).json({ error: "Failed to fetch financial targets" });
	  });
  });
  
// 15. Set a financial target
app.post("/api/financial-targets/set", (req, res) => {
	const { category, targetAmount } = req.body;
	const query =
	  "INSERT INTO financial_targets (category, target_amount) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET target_amount = $2";
  
	db.query(query, [category, targetAmount], (err) => {
	  if (err) {
		console.error("Error setting financial target:", err);
		return res.status(500).send("Internal Server Error");
	  }
	  res.status(200).send("Target set successfully");
	});
  });
  
// 16. Remove a financial target
app.post("/api/financial-targets/remove", (req, res) => {
	const { category } = req.body;
  
	if (!category) {
	  return res.status(400).send("Category is required");
	}
  
	const query = "DELETE FROM financial_targets WHERE category = $1";
  
	db.query(query, [category], (err) => {
	  if (err) {
		console.error("Error removing financial target:", err);
		return res.status(500).send("Internal Server Error");
	  }
  
	  res.status(200).send("Target removed successfully");
	});
  });

// 22. Fetch the financial target for a specific category
app.get("/api/financial-targets/:category", (req, res) => {
	const category = req.params.category;
	const query = "SELECT target_amount FROM financial_targets WHERE category = $1";
  
	db.query(query, [category], (err, result) => {
	  if (err || result.rows.length === 0) {
		console.error("Error fetching financial target:", err || "Target not found");
		return res.status(404).send("Target not found");
	  }
	  res.status(200).json(result.rows[0]);
	});
  });

// *********
// User Authentication
// *********

// 17. User signup
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
  
  
// 18. User login
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
		user: { id: user.id, username: user.username },
	  });
	} catch (error) {
	  console.error("Error logging in:", error);
	  res.status(500).json({ message: "Error logging in" });
	}
  });
  
// 19. Logout
app.post("/api/logout", (req, res) => {
	req.session.destroy((err) => {
	  if (err) {
		return res.status(500).json({ message: "Error logging out" });
	  }
	  res.json({ message: "Logged out successfully" });
	});
  });
  
// 20. Get current user
app.get("/api/user", (req, res) => {
	if (req.session.userId) {
	  res.json({
		isLoggedIn: true,
		user: {
		  id: req.session.userId,
		  username: req.session.username,
		},
	  });
	} else {
	  res.status(404).json({ isLoggedIn: false });
	}
  });

  // Fetch all transactions from the database
app.get("/api/transactions", (req, res) => {
    db.query("SELECT date, name, amount, category, source FROM transactions ORDER BY date DESC")
        .then(result => res.json(result.rows))
        .catch(error => {
            console.error("Error fetching transactions:", error);
            res.status(500).json({ error: "Failed to fetch transactions" });
        });
});


// *********
// Start Server
// *********

// Start the server
app.listen(port, host, () => {
	console.log(`Server running at http://${host}:${port}`);
  });