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
  const categories = document.getElementById("transaction-categories");
  categories.innerHTML = '<h2>Transactions by Category</h2>';

  const categorizedTransactions = {};
  transactions.forEach(transaction => {
    const primaryCategory = transaction.personal_finance_category.primary;
  
    if (!categorizedTransactions[primaryCategory]) {
      categorizedTransactions[primaryCategory] = [];
    }
  
    categorizedTransactions[primaryCategory].push(transaction);
  });
  

  // Create a section for each primary category
  for (const category in categorizedTransactions) {
    const categorySection = document.createElement("div");
    categorySection.className = "category-section";
    categorySection.id = `category-${category.toLowerCase()}`;
  
    const categoryTitle = document.createElement("h3");
    categoryTitle.textContent = formatCategoryName(category);
    categorySection.appendChild(categoryTitle);
  
    const transactionList = document.createElement("ul");
    transactionList.className = "transaction-list";
    categorizedTransactions[category].forEach(transaction => {
      const { date, amount, name } = transaction;
      const listItem = document.createElement("li");
      listItem.textContent = `${date} - $${amount.toFixed(2)} - ${name}`;
      transactionList.appendChild(listItem);
    });
  
    categorySection.appendChild(transactionList);
    categories.appendChild(categorySection);
  }
}

function formatCategoryName(category) {
  return category
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}


document.addEventListener("DOMContentLoaded", () => {
  const openModalButton = document.getElementById("open-modal");
  const modal = document.getElementById("transaction-modal");
  const closeModalButton = document.getElementById("close-modal");

  // Open modal
  openModalButton.addEventListener("click", () => {
    modal.style.display = "block";
  });

  // Close modal
  closeModalButton.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
});
