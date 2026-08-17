const API_URL = "";

const token = localStorage.getItem("access_token");

if (!token) {
    window.location.href = "login.html";
}

async function loadDashboard() {
    try {
        const userResponse = await fetch(`${API_URL}/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            localStorage.removeItem("access_token");
            window.location.href = "login.html";
            return;
        }

        const user = await userResponse.json();

        document.getElementById("userName").textContent = user.name;
        document.getElementById("welcomeMessage").textContent =
            `Welcome back, ${user.name} 👋`;


        const dashboardResponse = await fetch(`${API_URL}/dashboard`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const dashboard = await dashboardResponse.json();

        document.getElementById("totalIncome").textContent =
            `₹${dashboard.total_income.toLocaleString()}`;

        document.getElementById("totalExpenses").textContent =
            `₹${dashboard.total_expenses.toLocaleString()}`;

        document.getElementById("currentBalance").textContent =
            `₹${dashboard.balance.toLocaleString()}`;


        const transactionsResponse = await fetch(`${API_URL}/transactions`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const transactions = await transactionsResponse.json();

        const table = document.getElementById("transactionsTable");

        table.innerHTML = "";

        if (transactions.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">No transactions yet.</td>
                </tr>
            `;
            return;
        }

        const recentTransactions = transactions.slice(-5).reverse();

        recentTransactions.forEach(transaction => {
            const row = document.createElement("tr");

            const amountSign =
                transaction.type === "income" ? "+" : "-";

            const amountClass =
    transaction.type === "income"
        ? "amount-income"
        : "amount-expense";

row.innerHTML = `
    <td>${transaction.date}</td>

    <td>
        <span class="type-badge ${transaction.type}">
            ${transaction.type}
        </span>
    </td>

    <td>${transaction.category}</td>

    <td>${transaction.description}</td>

    <td class="${amountClass}">
        ${amountSign}₹${transaction.amount.toLocaleString()}
    </td>
`;

            table.appendChild(row);
        });

    } catch (error) {
        console.error(error);
    }
}


document
    .getElementById("logoutButton")
    .addEventListener("click", function () {

        localStorage.removeItem("access_token");

        window.location.href = "login.html";
    });

const addTransactionButton =
    document.getElementById("addTransactionButton");

const transactionModal =
    document.getElementById("transactionModal");

const closeModalButton =
    document.getElementById("closeModalButton");

const transactionForm =
    document.getElementById("transactionForm");


addTransactionButton.addEventListener("click", function () {
    transactionModal.classList.add("show");
});


closeModalButton.addEventListener("click", function () {
    transactionModal.classList.remove("show");
});

let categories = [];


async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        categories = await response.json();

    } catch (error) {
        console.error("Could not load categories", error);
    }
}

const transactionType =
    document.getElementById("transactionType");

const transactionCategory =
    document.getElementById("transactionCategory");

transactionType.addEventListener("change", function () {

    const selectedType = transactionType.value;

    transactionCategory.innerHTML =
        `<option value="">Select category</option>`;

    const filteredCategories = categories.filter(
        category => category.type === selectedType
    );

    filteredCategories.forEach(category => {

        const option = document.createElement("option");

        option.value = category.name;
        option.textContent = category.name;

        transactionCategory.appendChild(option);
    });
});

transactionForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("transactionMessage");

    const transactionData = {
        type: transactionType.value,
        category: transactionCategory.value,
        amount: parseFloat(
            document.getElementById("transactionAmount").value
        ),
        description:
            document.getElementById("transactionDescription").value,
        date:
            document.getElementById("transactionDate").value
    };

    try {
        const response = await fetch(`${API_URL}/transactions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
        });

        const data = await response.json();

        if (!response.ok) {
            if (Array.isArray(data.detail)) {
                message.textContent = data.detail[0].msg;
            } else {
                message.textContent =
                    data.detail || "Could not add transaction";
            }

            return;
        }

        message.textContent = "Transaction added successfully";

        transactionForm.reset();

        setTimeout(function () {
            transactionModal.classList.remove("show");
            message.textContent = "";
        }, 700);

        await loadDashboard();

    } catch (error) {
        console.error(error);
        message.textContent = "Could not connect to server";
    }
});

loadCategories();
loadDashboard();