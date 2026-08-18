const API_URL = "";

const token = localStorage.getItem("access_token");

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

    const userInitial =
    document.getElementById("userInitial");

if (userInitial && user.name) {
    userInitial.textContent =
        user.name.trim().charAt(0).toUpperCase();
}
}


async function loadSummary() {
    const response = await fetch(`${API_URL}/dashboard`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await response.json();

    document.getElementById("reportIncome").textContent =
        `₹${data.total_income.toLocaleString()}`;

    document.getElementById("reportExpenses").textContent =
        `₹${data.total_expenses.toLocaleString()}`;

    document.getElementById("reportBalance").textContent =
        `₹${data.balance.toLocaleString()}`;
}

async function loadExpenseChart() {

    const today = new Date();

    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const response = await fetch(
        `${API_URL}/reports/expenses-by-category?year=${year}&month=${month}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    const labels = Object.keys(data.expenses);
    const values = Object.values(data.expenses);

    new Chart(
        document.getElementById("expenseChart"),
        {
            type: "doughnut",

            data: {
                labels: labels,

                datasets: [
                    {
                        data: values
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}

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


async function loadMonthlyChart() {

    const today = new Date();

    const labels = [];
    const incomeValues = [];
    const expenseValues = [];

    for (let i = 5; i >= 0; i--) {

        const date = new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
        );

        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const response = await fetch(
            `${API_URL}/reports/monthly?year=${year}&month=${month}`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        labels.push(
            date.toLocaleString("default", {
                month: "short"
            })
        );

        incomeValues.push(data.total_income);
        expenseValues.push(data.total_expenses);
    }


    new Chart(
        document.getElementById("monthlyChart"),
        {
            type: "bar",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Income",
                        data: incomeValues
                    },
                    {
                        label: "Expenses",
                        data: expenseValues
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}

async function loadIncomeChart() {

    const response = await fetch(
        `${API_URL}/transactions?type=income`,
        {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        }
    );

    const transactions = await response.json();

    const today = new Date();

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const totals = {};

    transactions.forEach(transaction => {

        const transactionDate =
            new Date(transaction.date);

        const transactionYear =
            transactionDate.getFullYear();

        const transactionMonth =
            transactionDate.getMonth() + 1;

        if (
            transactionYear === currentYear &&
            transactionMonth === currentMonth
        ) {

            if (totals[transaction.category]) {
                totals[transaction.category] +=
                    transaction.amount;
            } else {
                totals[transaction.category] =
                    transaction.amount;
            }
        }
    });


    new Chart(
        document.getElementById("incomeChart"),
        {
            type: "doughnut",

            data: {
                labels: Object.keys(totals),

                datasets: [
                    {
                        data: Object.values(totals)
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}

document
    .getElementById("exportCsvButton")
    .addEventListener("click", async function () {

        try {
            const response = await fetch(
                `${API_URL}/transactions/export/csv`,
                {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                alert("Could not export transactions");
                return;
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;
            link.download = "ledgerly_transactions.csv";

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error(error);

            alert("Could not connect to server");
        }
    });

async function initializeReports() {
    await loadUser();
    await loadSummary();
    await loadMonthlyChart();
    await loadExpenseChart();
    await loadIncomeChart();
}


initializeReports();