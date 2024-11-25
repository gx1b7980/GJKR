document.getElementById('transaction-form').addEventListener('submit', function(event) {
  event.preventDefault();

  const date = document.getElementById('date').value;
  const amount = document.getElementById('amount').value;
  const category = document.getElementById('category').value;

  if (!date || !amount || !category) {
    alert('Please fill in all fields.');
    return;
  }

  const transactionData = { date, amount, category };
  createTransaction(transactionData);
});

async function createTransaction(data) {
  try {
    const response = await fetch('/api/transactions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      alert('Transaction created successfully!');
      window.location.reload();
    } else {
      alert('Error creating transaction. Please try again.');
    }
  } catch (error) {
    alert('Error creating transaction. Please try again.');
  }
}
