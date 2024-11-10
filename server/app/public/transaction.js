function createTransaction(event) {  
    const transactionData = {
      date: document.getElementById("date").value,
      amount: parseFloat(document.getElementById("amount").value),
      category: document.getElementById("category").value,
    };
  
    fetch('/api/transactions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error("Error creating transaction");
        }
        return response.json();
      })
      .then(data => {
        alert("Transaction created successfully!");
        document.getElementById("transaction-form").reset();
      })
      .catch(error => console.error("Error:", error));
  }