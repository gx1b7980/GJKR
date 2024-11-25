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
      if (Array.isArray(data)) {
        const transactions = data;
        loadFinancialTargets().then(targets => {
          displayTransactions(transactions, targets);
        });
      }
    })
    .catch(error => console.error("Error:", error));
}

function loadFinancialTargets() {
  return fetch('/api/financial-targets')
    .then(response => {
      if (!response.ok) {
        throw new Error("Error fetching financial targets");
      }
      return response.json();
    })
    .catch(error => {
      console.error("Error:", error);
      return {};
    });
}

function displayTransactions(transactions, targets) {
  const categories = document.getElementById("transaction-categories");
  categories.innerHTML = '<h2>Transactions by Category</h2>';

  const categorizedTransactions = {};
  const categorySums = {};
  const categoryMapping = {
    Food: "dining",
    Leisure: "entertainment",
    Miscellaneous: "personal",
    Essentials: "groceries",
    Utilities: "bills",
    Travel: "transportation",
  };

  // Categorize transactions and calculate sums
  transactions.forEach(transaction => {
    const primaryCategory = transaction.personal_finance_category?.primary || transaction.primary_category;
    if (!primaryCategory) return;

    if (!categorizedTransactions[primaryCategory]) {
      categorizedTransactions[primaryCategory] = [];
      categorySums[primaryCategory] = 0;
    }

    categorizedTransactions[primaryCategory].push(transaction);
    categorySums[primaryCategory] += parseFloat(transaction.amount) || 0;
  });

  // Create a section for each category
  for (const category in categorizedTransactions) {
    const mappedCategory = categoryMapping[category] || category;
    const targetAmount = parseFloat(targets[mappedCategory]) || 0;
    const totalSpent = categorySums[category];
    const exceededBudget = targetAmount > 0 && totalSpent > targetAmount;

    const categorySection = document.createElement("div");
    categorySection.className = "category-section";
    categorySection.id = `category-${category.toLowerCase()}`;

    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";

    const categoryTitle = document.createElement("h3");
    categoryTitle.textContent = formatCategoryName(category);

    const spentInfo = document.createElement("div");
    spentInfo.textContent = `Spent: $${totalSpent.toFixed(2)}`;
    
    categoryTitle.appendChild(spentInfo);

    if (targetAmount > 0) {
      const budgetInfo = document.createElement("span");
      budgetInfo.className = "budget-info";
      budgetInfo.textContent = ` Budget: $${targetAmount.toFixed(2)}`;
      categoryTitle.appendChild(budgetInfo);

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove Target";
      removeButton.className = "remove-target";
      removeButton.addEventListener("click", () => removeTarget(mappedCategory));
      categoryTitle.appendChild(removeButton);
    }

    categoryHeader.appendChild(categoryTitle);
    categorySection.appendChild(categoryHeader);

    const transactionList = document.createElement("ul");
    transactionList.className = "transaction-list";

    categorizedTransactions[category].forEach(transaction => {
      const { date, amount } = transaction;
      const detailedCategory = transaction.personal_finance_category?.detailed || transaction.detailed_category || "Uncategorized";
      const listItem = document.createElement("li");
      listItem.textContent = `${date} - $${Number(amount).toFixed(2)} - ${detailedCategory}`;
      transactionList.appendChild(listItem);
    });

    categorySection.appendChild(transactionList);
    categories.appendChild(categorySection);
    categorySection.style.backgroundColor = exceededBudget ? "red" : "";
  }
}

function formatCategoryName(category) {
  return category
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

document.addEventListener("DOMContentLoaded", () => {
  const targetForm = document.getElementById("target-form");

  if (targetForm) {
    targetForm.addEventListener("submit", (event) => {
      event.preventDefault();
      setFinancialTarget();
    });
  }
});

function setFinancialTarget() {
  const category = document.getElementById("target-category").value;
  const targetAmount = parseFloat(document.getElementById("target-amount").value);

  if (isNaN(targetAmount) || targetAmount <= 0) {
    alert("Please enter a valid budget target greater than 0.");
    return;  
  }

  fetch('/api/financial-targets/set', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category, targetAmount }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error setting financial target');
      }
      alert("Target set successfully!");
      loadTransactions();
    })
    .catch(error => console.error("Error:", error));
}

function removeTarget(category) {
  fetch('/api/financial-targets/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ category }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error removing financial target');
      }
      alert(`${category} target removed successfully`);
      loadTransactions();
    })
    .catch(error => console.error("Error:", error));
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
