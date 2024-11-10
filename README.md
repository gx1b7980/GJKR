# **Personal Finance Tracker and Budgeting Tool**

## Description
Users can track their expenses, set up budget goals, and view detailed reports on their spending patterns.

## Features:
- Connects with a banking API or uses manual input for transactions.
- Summarize Transactions - Overview Page
- Allows users to categorize expenses and set budget limits.
- Interactive charts for visualizing spending vs. budget.
- Notifications if spending exceeds budget. (Optional)
- Ability to save reports or export them as PDFs.
- Pre-create Transactions Manually
- Pre-set Categories with Targets & Limits 
Think of a Financial Philosophy & Model -> 
 Technical Aspects:
- PostGres Database to store transactions and categories.
- Integration with APIs for real-time exchange rates, or banking transactions.
- Secure user authentication for managing personal finances.
- Use of client-side JS for interactive reports and budgeting features.

### Initial Plaid API sandbox environment setup
In order to run and connect to Plaid API at http://localhost:3000:
1. Create a plaid API account at https://plaid.com/docs/ and retrieve the client_id key and secret key.
2. Place both keys in env.json as 'client_IDKey' and 'secretKey' respectively.
3. Run the server at http://localhost:3000.
4. Additional information for username, password, and other test credentials for Plaids sandbox can be found here: https://plaid.com/docs/sandbox/test-credentials/#auth-micro-deposit-testing-credentials