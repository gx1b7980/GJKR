document.addEventListener("DOMContentLoaded", loadTransactions);

function loadTransactions() {
  fetch('/api/transactions')
    .then(response => {
      if (!response.ok) {
        throw new Error("Error fetching transactions");
      }
      return response.json();
    })
    .then(data => {
      displayTransactions(data);
    })
    .catch(error => console.error("Error:", error));
}

function displayTransactions(transactions) {
  const categories = {
    groceries: document.getElementById("groceries-list"),
    entertainment: document.getElementById("entertainment-list"),
    dining: document.getElementById("dining-list"),
    bills: document.getElementById("bills-list"),
    transportation: document.getElementById("transportation-list"),
    personal: document.getElementById("personal-list"),
  };

  transactions.forEach(transaction => {
    const { date, amount, category } = transaction;
    if (categories[category]) {
      const listItem = document.createElement("li");
      listItem.textContent = `${date} - $${amount}`;
      categories[category].appendChild(listItem);
    }
  });
}
