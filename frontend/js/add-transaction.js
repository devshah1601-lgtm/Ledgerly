const API_URL = "";

const token = localStorage.getItem("access_token");

if (!token) {
    window.location.href = "/";
}

let categories = [];
let selectedType = "income";


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

    const userInitial = document.getElementById("userInitial");

    if (userInitial && user.name) {
        userInitial.textContent =
            user.name.trim().charAt(0).toUpperCase();
    }
}


async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        categories = await response.json();

        updateCategoryDropdown();
        renderRecentCategories();

    } catch (error) {
        console.error("Could not load categories", error);
    }
}


function updateCategoryDropdown() {
    const categorySelect =
        document.getElementById("transactionCategory");

    categorySelect.innerHTML =
        `<option value="">Select category</option>`;

    const filteredCategories = categories.filter(
        category => category.type === selectedType
    );

    filteredCategories.forEach(category => {
        const option = document.createElement("option");

        option.value = category.name;
        option.textContent = category.name;

        categorySelect.appendChild(option);
    });
}


function renderRecentCategories() {
    const container =
        document.getElementById("recentCategories");

    const filteredCategories = categories.filter(
        category => category.type === selectedType
    );

    container.innerHTML = "";

    if (filteredCategories.length === 0) {
        container.innerHTML =
            `<p class="empty-chart-message">
                No categories available.
            </p>`;

        return;
    }

    filteredCategories.slice(0, 6).forEach(category => {
        const item = document.createElement("div");

        item.className = "recent-category-item";

        item.innerHTML = `
            <span class="recent-category-icon">
                ${selectedType === "income" ? "₹" : "−"}
            </span>

            <span>${category.name}</span>
        `;

        container.appendChild(item);
    });
}


function setTransactionType(type) {
    selectedType = type;

    document.getElementById("transactionType").value = type;

    const incomeTab =
        document.getElementById("incomeTab");

    const expenseTab =
        document.getElementById("expenseTab");

    incomeTab.classList.toggle(
        "active",
        type === "income"
    );

    expenseTab.classList.toggle(
        "active",
        type === "expense"
    );

    updateCategoryDropdown();
    renderRecentCategories();
}


document
    .getElementById("incomeTab")
    .addEventListener("click", function () {
        setTransactionType("income");
    });


document
    .getElementById("expenseTab")
    .addEventListener("click", function () {
        setTransactionType("expense");
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
    .getElementById("addTransactionForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const message =
            document.getElementById("transactionMessage");

        const transactionData = {
            type: document.getElementById("transactionType").value,

            category:
                document.getElementById("transactionCategory").value,

            amount:
                parseFloat(
                    document.getElementById("transactionAmount").value
                ),

            description:
                document.getElementById("transactionDescription").value,

            date:
                document.getElementById("transactionDate").value
        };

        try {
            const response = await fetch(
                `${API_URL}/transactions`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },

                    body: JSON.stringify(transactionData)
                }
            );

            const data = await response.json();

            if (!response.ok) {

                if (Array.isArray(data.detail)) {
                    message.textContent =
                        data.detail[0].msg;
                } else {
                    message.textContent =
                        data.detail ||
                        "Could not add transaction";
                }

                return;
            }

            message.textContent =
                "Transaction added successfully";

            document
                .getElementById("addTransactionForm")
                .reset();

            setTransactionType("income");

            setTimeout(function () {
                window.location.href =
                    "transactions.html";
            }, 800);

        } catch (error) {
            console.error(error);

            message.textContent =
                "Could not connect to server";
        }
    });


function setTodayDate() {
    const dateInput =
        document.getElementById("transactionDate");

    const today =
        new Date().toISOString().split("T")[0];

    dateInput.value = today;
}


async function initializePage() {
    setTodayDate();
    await loadUser();
    await loadCategories();
}

initializePage();