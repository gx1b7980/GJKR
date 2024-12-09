// Function to initialize Plaid Link and handle the process
function connectToPlaid() {
    fetch('/api/create_link_token', { method: 'POST' })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to create link token.");
        }
        return response.json();
      })
      .then(data => {
        const linkHandler = Plaid.create({
          token: data.link_token,
          onSuccess: function(public_token) {
            fetch('/api/exchange_public_token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_token })
            })
              .then(exchangeResponse => exchangeResponse.json())
              .catch(error => console.error("Error exchanging public token:", error));
          },
          onExit: function(err, metadata) {
            if (err) {
              console.error("Plaid exit error:", err);
            }
          }
        });
        linkHandler.open();
      })
      .catch(error => console.error("Error:", error));
  }
// Open the Transactions Modal
function openTransactionsModal() {
  const modal = document.getElementById('transactions-modal');
  modal.style.display = 'block';
}

// Close the Transactions Modal
function closeTransactionsModal() {
  const modal = document.getElementById('transactions-modal');
  modal.style.display = 'none';
}

// Close the modal when clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('transactions-modal');
  if (event.target === modal) {
      modal.style.display = 'none';
  }
};

// Fetch and display transaction list
function loadTransactions() {
  const section = document.getElementById("dynamic-content-section");
  const title = document.getElementById("dynamic-content-title");
  const body = document.getElementById("dynamic-content-body");

  section.style.display = "block"; // Ensure the section is visible
  title.textContent = "Select Category for Transactions";
  body.innerHTML = ""; // Clear previous content

  fetch("/api/transactions/sync", { method: "POST" })
      .then(response => {
          if (!response.ok) throw new Error("Failed to fetch transactions.");
          return response.json();
      })
      .then(data => {
          const table = document.createElement("table");
          table.setAttribute("id", "dynamic-content-table");
          table.style.display = "table";

          // Add table headers dynamically
          const thead = document.createElement("thead");
          thead.innerHTML = `
              <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Action</th>
              </tr>
          `;
          table.appendChild(thead);

          const tbody = document.createElement("tbody");

          data.transactions.forEach(transaction => {
              const row = document.createElement("tr");

              // Dropdown to select category
              const categoryDropdown = `
                  <select>
                      <option value="">Select Category</option>
                      <option value="groceries">Groceries</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="dining">Dining</option>
                      <option value="bills">Bills</option>
                      <option value="transportation">Transportation</option>
                      <option value="personal">Personal</option>
                  </select>
              `;

              // Add row content
              row.innerHTML = `
                  <td>${new Date(transaction.date).toLocaleDateString()}</td>
                  <td>${transaction.name}</td>
                  <td>$${transaction.amount.toFixed(2)}</td>
                  <td>${categoryDropdown}</td>
                  <td><button class="save-transaction">Save</button></td>
              `;

              // Add event listener for the save button
              const saveButton = row.querySelector(".save-transaction");
              saveButton.addEventListener("click", () => {
                  const selectedCategory = row.querySelector("select").value;
                  if (!selectedCategory) {
                      alert("Please select a category before saving.");
                      return;
                  }

                  const transactionData = {
                      date: transaction.date,
                      name: transaction.name,
                      amount: transaction.amount,
                      category: selectedCategory,
                  };

                  saveTransaction(transactionData);
              });

              tbody.appendChild(row);
          });

          table.appendChild(tbody);
          body.appendChild(table);
      })
      .catch(error => console.error("Error loading transactions:", error));
}


// Fetch and display combined transactions
function getCombinedTransactions() {
  const section = document.getElementById('dynamic-content-section');
  const title = document.getElementById('dynamic-content-title');
  const body = document.getElementById('dynamic-content-body');

  section.style.display = 'block'; // Ensure the section is visible
  title.textContent = 'Transactions for Linking';
  body.innerHTML = ''; // Clear previous content

  const table = document.createElement('table');
  table.setAttribute('id', 'dynamic-content-table');
  table.style.display = 'table'; // Ensure the table is visible

  // Add table headers dynamically
  const thead = document.createElement('thead');
  thead.innerHTML = `
      <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>Category</th>
          <th>Source</th>
          <th>Action</th>
      </tr>
  `;
  table.appendChild(thead);

  // Add table body
  const tbody = document.createElement('tbody');
  tbody.setAttribute('id', 'dynamic-content-body-rows');
  table.appendChild(tbody);

  body.appendChild(table);

  // Fetch transactions and populate the table
  fetch('/api/transactions/combined', { method: 'GET' })
      .then(response => {
          if (!response.ok) throw new Error('Failed to fetch combined transactions.');
          return response.json();
      })
      .then(data => {
          // Populate linked transactions
          data.linkedTransactions.forEach(transaction => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${new Date(transaction.date).toLocaleDateString()}</td>
                  <td>$${transaction.amount}</td>
                  <td>${transaction.category}</td>
                  <td>${transaction.source}</td>
                  <td>
                      <button onclick="unlinkTransaction(${transaction.id})">Unlink</button>
                  </td>
              `;
              tbody.appendChild(row);
          });

          // Populate unlinked transactions
          data.unlinkedTransactions.forEach(transaction => {
              const row = document.createElement('tr');
              row.innerHTML = `
                  <td>${new Date(transaction.date).toLocaleDateString()}</td>
                  <td>$${transaction.amount}</td>
                  <td>${transaction.category}</td>
                  <td>${transaction.source}</td>
                  <td>
                      <button onclick="linkTransaction(${transaction.id})">Link</button>
                  </td>
              `;
              tbody.appendChild(row);
          });
      })
      .catch(error => console.error('Error fetching combined transactions:', error));
}

// Link a transaction
function linkTransaction(transactionId) {
  fetch(`/api/transactions/link/${transactionId}`, {
      method: 'POST',
  })
      .then(response => {
          if (response.ok) {
              alert('Transaction linked successfully!');
              getCombinedTransactions();
          }
      })
      .catch(error => console.error('Error linking transaction:', error));
}

// Unlink a transaction
function unlinkTransaction(transactionId) {
  fetch(`/api/transactions/unlink/${transactionId}`, {
      method: 'POST',
  })
      .then(response => response.json())
      .then(data => {
          if (data.error) {
              alert('Transaction cannot be unlinked because it was pulled from Plaid!');
          } else {
              alert('Transaction unlinked successfully!');
              getCombinedTransactions();
          }
      })
      .catch(error => console.error('Error unlinking transaction:', error));
}



  
 // Save Plaid transactions
function saveTransaction(transactionData) {
  if (!transactionData.category) {
    alert("Please select a category for the transaction.");
    return;
  }

  fetch("/api/transactions/plaid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: [transactionData] }),  
  })
    .then(response => response.json())
    .then(data => {
      if (data.message) {

        if (data.message === 'Transaction not created because it already exists.') {
          alert(data.message);
        } else {
          alert("Plaid transaction saved successfully!");
        }
      }
    })
    .catch(error => {
      console.error("Error saving transaction:", error);
      alert("Failed to save transaction.");
    });
}

  
  