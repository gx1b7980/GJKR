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

  function getCombinedTransactions() {
    fetch("/api/transactions/combined", { method: "GET" })
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch combined transactions.");
        return response.json();
      })
      .then(data => {
        const linkedContainer = document.getElementById("linked-transactions");
        const unlinkedContainer = document.getElementById("unlinked-transactions");
  
        linkedContainer.innerHTML = "";
        unlinkedContainer.innerHTML = "";
  
        // Display linked transactions
        data.linkedTransactions.forEach(transaction => {
          const linkedItem = document.createElement("div");
          linkedItem.innerHTML = `
            <p>${transaction.date}: $${transaction.amount} - ${transaction.category} - ${transaction.source}</p>
            <button onclick="unlinkTransaction(${transaction.id})">Unlink</button>
          `;
          linkedContainer.appendChild(linkedItem);
        });
  
        // Display unlinked transactions
        data.unlinkedTransactions.forEach(transaction => {
          const unlinkedItem = document.createElement("div");
          unlinkedItem.innerHTML = `
            <p>${transaction.date}: $${transaction.amount} - ${transaction.category} - ${transaction.source}</p>
            <button onclick="linkTransaction(${transaction.id})">Link</button>
          `;
          unlinkedContainer.appendChild(unlinkedItem);
        });
      })
      .catch(error => console.error("Error fetching combined transactions:", error));
      
      fetch('/api/transactions/auto-link', {
        method: 'POST',
      })
      .then(response => response.json())
      .catch(error => {
        console.error('Error linking transactions:', error);
      });
    }

  
  function linkTransaction(transactionId) {
    fetch(`/api/transactions/link/${transactionId}`, {
      method: "POST",
    })
      .then(response => {
        if (response.ok) {
          alert('Transaction linked successfully!');
          getCombinedTransactions();
        }
      })
      .catch(error => console.error("Error linking transaction:", error));
  }
  
  function unlinkTransaction(transactionId) {
    fetch(`/api/transactions/unlink/${transactionId}`, {
      method: "POST",
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {

          alert('Transaction cannot be unlinked because it was pulled from plaid!');
        } else {
          alert('Transaction unlinked successfully!');
          getCombinedTransactions();
        }
      })
      .catch(error => console.error("Error unlinking transaction:", error));
  }
  
  
  function loadTransactions() {
    fetch("/api/transactions/sync", { method: "POST" })
      .then(response => response.json())
      .then(data => {
        const transactionListDiv = document.getElementById("transaction-list");
        transactionListDiv.innerHTML = "";
  
        data.transactions.forEach(transaction => {
          const transactionItem = document.createElement("div");
          transactionItem.innerHTML = `
            <p class="transaction-date">${transaction.date}</p>
            <p class="transaction-amount">$${Math.floor(transaction.amount * 100) / 100}</p>
            <p class="transaction-name">${transaction.name}</p>
            <select class="category-selector" data-transaction-id="${transaction.id}">
              <!-- Categories will be populated dynamically -->
            </select>
            <button class="save-button">Save Transaction</button>
          `;
          transactionListDiv.appendChild(transactionItem);
  
          fetch("/api/categories", { method: "GET" })
            .then(response => response.json())
            .then(categories => {
              const dropdown = transactionItem.querySelector(".category-selector");
              categories.forEach(category => {
                const option = document.createElement("option");
                option.value = category.name;
                option.textContent = category.name;
                dropdown.appendChild(option);
              });
            })
            .catch(error => console.error("Error fetching categories:", error));
  
          const saveButton = transactionItem.querySelector(".save-button");
          saveButton.addEventListener("click", () => {
            const categoryDropdown = transactionItem.querySelector(".category-selector");
            const category = categoryDropdown.value;
  
            const transactionData = {
              date: transaction.date,
              amount: Math.floor(transaction.amount * 100) / 100,
              name: transaction.name,
              category: category,
            };
              saveTransaction(transactionData);
          });
        });
      })
      .catch(error => console.error("Error fetching transactions:", error));
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

  
  