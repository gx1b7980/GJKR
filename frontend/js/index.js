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
    fetch("/api/transactions/all", { method: "GET" })
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch transactions.");
        return response.json();
      })
      .then(data => {
        const transactions = data.transactions;
        const transactionContainer = document.getElementById("combined-transaction-data");
        while (transactionContainer.firstChild) transactionContainer.removeChild(transactionContainer.firstChild);
  
        const transactionList = document.createElement("ul");
        transactions.forEach(transaction => {
          const listItem = document.createElement("li");
          listItem.textContent = `${transaction.date}: $${Math.floor(transaction.amount * 100) / 100} (${transaction.name})`;
          transactionList.appendChild(listItem);
        });
        transactionContainer.appendChild(transactionList);
        transactionContainer.style.display = "block";
        transactionContainer.style.background = "#F6F6F6";
      })
      .catch(error => console.error("Error fetching combined transactions:", error));
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
  
  // Updated saveTransaction function
  function saveTransaction(transactionData) {
    if (!transactionData.category) {
      alert("Please select a category for the transaction.");
      return;
    }
  
    fetch("/api/transactions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transactionData),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to save transaction.");
        }
        return response.json();
      })
      .then(() => {
        alert("Transaction saved successfully!");
      })
      .catch(error => console.error("Error saving transaction:", error));
  }
  
  
  function getTransactions() {
    fetch("/api/transactions/sync", { method: "POST" })
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch transactions.");
        }
        return response.json();
      })
      .then(data => {
        const pre = document.getElementById("transaction-data");
        pre.textContent = JSON.stringify(data, null, 2);
        pre.style.display = "block";
        pre.style.background = "#F6F6F6";
      })
      .catch(error => console.error("Error fetching transactions:", error));
  }
  
  