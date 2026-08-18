const API_URL = "";

const token = localStorage.getItem("access_token");

let categories = [];
let transactionsData = [];

if (!token) {
    window.location.href = "/";
}


async function loadUser() {
    const response = await fetch(`${API_URL}/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        localStorage.removeItem("access_token");
        window.location.href = "/";
        return;
    }

    const user = await response.json();

    document.getElementById("userName").textContent = user.name;
}


async function loadCategories() {
    const response = await fetch(`${API_URL}/categories`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    categories = await response.json();

    const categoryFilter =
        document.getElementById("categoryFilter");

    categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category.name;
        option.textContent = category.name;

        categoryFilter.appendChild(option);
    });
}


async function loadTransactions() {

    const search =
        document.getElementById("searchInput").value;

    const type =
        document.getElementById("typeFilter").value;

    const category =
        document.getElementById("categoryFilter").value;

    const startDate =
        document.getElementById("startDate").value;

    const endDate =
        document.getElementById("endDate").value;


    const params = new URLSearchParams();

    if (search) {
        params.append("search", search);
    }

    if (type) {
        params.append("type", type);
    }

    if (category) {
        params.append("category", category);
    }

    if (startDate) {
        params.append("start_date", startDate);
    }

    if (endDate) {
        params.append("end_date", endDate);
    }


    const response = await fetch(
        `${API_URL}/transactions?${params.toString()}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const transactions = await response.json();
    transactionsData = transactions;

    const table =
        document.getElementById("transactionsTable");

    table.innerHTML = "";

    if (transactions.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6">
                    No transactions found.
                </td>
            </tr>
        `;

        return;
    }

    transactions
        .slice()
        .reverse()
        .forEach(transaction => {

            const row = document.createElement("tr");

            const sign =
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
    ${sign}₹${transaction.amount.toLocaleString()}
</td>

                <td>
                    <button
                        class="action-button edit-button"
                        data-id="${transaction.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="action-button delete-button"
                        data-id="${transaction.id}"
                    >
                        Delete
                    </button>
                </td>
            `;

            table.appendChild(row);
        });
}

const editModal =
    document.getElementById("editTransactionModal");

const closeEditModalButton =
    document.getElementById("closeEditModalButton");

const editType =
    document.getElementById("editTransactionType");

const editCategory =
    document.getElementById("editTransactionCategory");

function fillEditCategories(type, selectedCategory) {

    editCategory.innerHTML = "";

    const filteredCategories = categories.filter(
        category => category.type === type
    );

    filteredCategories.forEach(category => {

        const option = document.createElement("option");

        option.value = category.name;
        option.textContent = category.name;

        if (category.name === selectedCategory) {
            option.selected = true;
        }

        editCategory.appendChild(option);
    });
}

document
    .getElementById("filterButton")
    .addEventListener("click", loadTransactions);


document
    .getElementById("clearFiltersButton")
    .addEventListener("click", function () {

        document.getElementById("searchInput").value = "";
        document.getElementById("typeFilter").value = "";
        document.getElementById("categoryFilter").value = "";
        document.getElementById("startDate").value = "";
        document.getElementById("endDate").value = "";

        loadTransactions();
    });


document
    .getElementById("logoutButton")
    .addEventListener("click", function () {

        const confirmed = confirm(
            "Are you sure you want to logout?"
        );

        if (!confirmed) {
            return;
        }

        localStorage.removeItem("access_token");

        window.location.href = "/";
    });

document
    .getElementById("transactionsTable")
    .addEventListener("click", async function (event) {

        if (event.target.classList.contains("edit-button")) {

            const transactionId =
                parseInt(event.target.dataset.id);

            const transaction =
                transactionsData.find(
                    item => item.id === transactionId
                );

            if (!transaction) {
                return;
            }

            document.getElementById("editTransactionId").value =
                transaction.id;

            editType.value = transaction.type;

            fillEditCategories(
                transaction.type,
                transaction.category
            );

            document.getElementById("editTransactionAmount").value =
                transaction.amount;

            document.getElementById("editTransactionDescription").value =
                transaction.description;

            document.getElementById("editTransactionDate").value =
                transaction.date;

            editModal.classList.add("show");

            return;
        }

        if (!event.target.classList.contains("delete-button")) {
            return;
        }

        const transactionId = event.target.dataset.id;

        const confirmed = confirm(
            "Are you sure you want to delete this transaction?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/transactions/${transactionId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.detail || "Could not delete transaction");
                return;
            }

            await loadTransactions();

        } catch (error) {
            console.error(error);
            alert("Could not connect to server");
        }
    });

closeEditModalButton.addEventListener("click", function () {
    editModal.classList.remove("show");
});


editType.addEventListener("change", function () {
    fillEditCategories(
        editType.value,
        ""
    );
});

document
    .getElementById("editTransactionForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const transactionId =
            document.getElementById("editTransactionId").value;

        const message =
            document.getElementById("editTransactionMessage");

        const updatedTransaction = {
            type: document.getElementById("editTransactionType").value,
            category: document.getElementById("editTransactionCategory").value,
            amount: parseFloat(
                document.getElementById("editTransactionAmount").value
            ),
            description:
                document.getElementById("editTransactionDescription").value,
            date:
                document.getElementById("editTransactionDate").value
        };

        try {
            const response = await fetch(
                `${API_URL}/transactions/${transactionId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedTransaction)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    message.textContent = data.detail[0].msg;
                } else {
                    message.textContent =
                        data.detail || "Could not update transaction";
                }

                return;
            }

            message.textContent =
                "Transaction updated successfully";

            setTimeout(function () {
                editModal.classList.remove("show");
                message.textContent = "";
            }, 700);

            await loadTransactions();

        } catch (error) {
            console.error(error);

            message.textContent =
                "Could not connect to server";
        }
    });

async function initializePage() {
    await loadUser();
    await loadCategories();
    await loadTransactions();
}

initializePage();