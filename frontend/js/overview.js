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
        const year = new Date().getFullYear(); 
        showAllTransactionsForYear(year);
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

function filterTransactionsByMonthAndYear(month, year) {
  fetch('/api/transactions')
    .then(response => {
      if (!response.ok) {
        throw new Error("Error fetching transactions");
      }
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        const filteredTransactions = data.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return (
            transactionDate.getMonth() + 1 === month &&
            transactionDate.getFullYear() === year
          );
        });
        loadFinancialTargets().then(targets => {
          displayTransactions(filteredTransactions, targets);
        });
      }
    })
    .catch(error => console.error("Error:", error));
}

function displayTransactions(transactions, targets) {
  const categories = document.getElementById("transaction-categories");
  categories.innerHTML = `
    <h2>Transactions by Category</h2>
    <button id="toggle-manage" class="toggle-manage">Manage Transactions</button>
  `;

  let manageMode = false;

  const toggleManageButton = document.getElementById("toggle-manage");
  toggleManageButton.addEventListener("click", () => {
    manageMode = !manageMode;
    toggleManageButton.textContent = manageMode ? "Done Managing" : "Manage Transactions";
    document.querySelectorAll(".remove-target, .remove-transaction").forEach(button => {
      button.style.display = manageMode ? "inline-block" : "none";
    });
  });

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
      budgetInfo.textContent = ` Budget Target: $${targetAmount.toFixed(2)}`;
      categoryTitle.appendChild(budgetInfo);

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove Target";
      removeButton.className = "remove-target";
      removeButton.style.display = "none";
      removeButton.addEventListener("click", () => removeTarget(mappedCategory));
      categoryTitle.appendChild(removeButton);
    }

    categoryHeader.appendChild(categoryTitle);
    categorySection.appendChild(categoryHeader);

    const transactionList = document.createElement("ul");
    transactionList.className = "transaction-list";

    categorizedTransactions[category].forEach(transaction => {
      const { id, date, amount } = transaction;
      const detailedCategory = transaction.personal_finance_category?.detailed || transaction.detailed_category || "Uncategorized";

      const listItem = document.createElement("li");
      listItem.textContent = `${date} - ${amount} - ${detailedCategory}`;
      
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.className = "remove-transaction";
      removeButton.style.display = "none";
      removeButton.addEventListener("click", () => removeTransaction(id));
      listItem.appendChild(removeButton);

      transactionList.appendChild(listItem);
    });

    categorySection.appendChild(transactionList);
    categories.appendChild(categorySection);
    categorySection.style.backgroundColor = exceededBudget ? "red" : "";
  }
}


document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();

  const filterButton = document.getElementById("filter-transactions");
  filterButton.addEventListener("click", () => {
    const month = parseInt(document.getElementById("month").value);
    const year = parseInt(document.getElementById("year").value);
    filterTransactionsByMonthAndYear(month, year);
  });

  const showYearlyButton = document.getElementById("show-yearly-transactions");
  showYearlyButton.addEventListener("click", () => {
    const year = parseInt(document.getElementById("year").value);
    showAllTransactionsForYear(year);
  });
});

function showAllTransactionsForYear(year) {
  fetch('/api/transactions')
    .then(response => {
      if (!response.ok) {
        throw new Error("Error fetching transactions");
      }
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        const transactionsByMonthAndCategory = {};

        // Group transactions by month and category
        data.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          if (transactionDate.getFullYear() === year) {
            const month = transactionDate.getMonth() + 1; 
            const category = transaction.personal_finance_category?.primary || transaction.detailed_category;

            if (!category || category === "Uncategorized") {
              return;
            }

            if (!transactionsByMonthAndCategory[month]) {
              transactionsByMonthAndCategory[month] = {};
            }
            if (!transactionsByMonthAndCategory[month][category]) {
              transactionsByMonthAndCategory[month][category] = [];
            }
            transactionsByMonthAndCategory[month][category].push(transaction);
          }
        });

        loadFinancialTargets().then(targets => {
          displayYearlyTransactions(transactionsByMonthAndCategory, targets);
        });
      }
    })
    .catch(error => console.error("Error:", error));
}

function displayYearlyTransactions(transactionsByMonthAndCategory, targets) {
  const categoriesContainer = document.getElementById("transaction-categories");
  categoriesContainer.innerHTML = `
    <h2>All Transactions for Year</h2>
  `;

  for (let month = 1; month <= 12; month++) {
    const monthHeader = document.createElement("h3");
    monthHeader.textContent = getMonthName(month);
    categoriesContainer.appendChild(monthHeader);

    const categorizedTransactions = transactionsByMonthAndCategory[month] || {};

    for (const category in categorizedTransactions) {
      const targetAmount = parseFloat(targets[category]) || 0;
      const totalSpent = categorizedTransactions[category].reduce((sum, transaction) => sum + parseFloat(transaction.amount) || 0, 0);
      const exceededBudget = targetAmount > 0 && totalSpent > targetAmount;

      const categorySection = document.createElement("div");
      categorySection.className = "category-section";

      const categoryHeader = document.createElement("div");
      categoryHeader.className = "category-header";

      const categoryTitle = document.createElement("h4");
      categoryTitle.textContent = formatCategoryName(category);
      categoryHeader.appendChild(categoryTitle);

      const spentInfo = document.createElement("div");
      spentInfo.textContent = `Spent: $${totalSpent.toFixed(2)}`;
      categoryTitle.appendChild(spentInfo);

      if (targetAmount > 0) {
        const budgetInfo = document.createElement("span");
        budgetInfo.className = "budget-info";
        budgetInfo.textContent = ` Budget Target: $${targetAmount.toFixed(2)}`;
        categoryTitle.appendChild(budgetInfo);
      }

      categorySection.appendChild(categoryHeader);

      const transactionList = document.createElement("ul");
      transactionList.className = "transaction-list";

      categorizedTransactions[category].forEach(transaction => {
        const { id, date, amount } = transaction;
        const detailedCategory = transaction.personal_finance_category?.detailed || transaction.detailed_category || "Uncategorized";

        const listItem = document.createElement("li");
        listItem.textContent = `${date} - $${amount} - ${detailedCategory}`;

        transactionList.appendChild(listItem);
      });

      categorySection.appendChild(transactionList);
      categoriesContainer.appendChild(categorySection);

      categorySection.style.backgroundColor = exceededBudget ? "red" : "";
    }
  }
}

function getMonthName(month) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[month - 1];
}

function formatCategoryName(category) {
  return category
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}


function removeTransaction(transactionId) {
  fetch(`/api/transactions/${transactionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error removing transaction');
      }
      alert("Transaction removed successfully");

      const month = parseInt(document.getElementById("month").value);
      const year = parseInt(document.getElementById("year").value);

      filterTransactionsByMonthAndYear(month, year);
    })
    .catch(error => console.error("Error:", error));
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

      const month = parseInt(document.getElementById("month").value);
      const year = parseInt(document.getElementById("year").value);

      filterTransactionsByMonthAndYear(month, year);
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
