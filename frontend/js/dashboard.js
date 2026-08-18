const API_URL = "";

const token = localStorage.getItem("access_token");

if (!token) {
    window.location.href = "/";
}

let cashFlowChart = null;
let expenseCategoryChart = null;


async function loadDashboard() {
    try {
        const userResponse = await fetch(`${API_URL}/me`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            localStorage.removeItem("access_token");
            window.location.href = "/";
            return;
        }

        const user = await userResponse.json();

        document.getElementById("userName").textContent = user.name;

        document.getElementById("welcomeMessage").textContent =
            `Welcome back, ${user.name} 👋`;

        const userInitial = document.getElementById("userInitial");

        if (userInitial && user.name) {
            userInitial.textContent =
                user.name.trim().charAt(0).toUpperCase();
        }


        const dashboardResponse = await fetch(`${API_URL}/dashboard`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!dashboardResponse.ok) {
            throw new Error("Could not load dashboard data");
        }

        const dashboard = await dashboardResponse.json();

        document.getElementById("totalIncome").textContent =
            `₹${dashboard.total_income.toLocaleString()}`;

        document.getElementById("totalExpenses").textContent =
            `₹${dashboard.total_expenses.toLocaleString()}`;

        document.getElementById("currentBalance").textContent =
            `₹${dashboard.balance.toLocaleString()}`;


        const transactionsResponse = await fetch(
            `${API_URL}/transactions`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!transactionsResponse.ok) {
            throw new Error("Could not load transactions");
        }

        const transactions = await transactionsResponse.json();

        renderRecentTransactions(transactions);
        renderCashFlowChart(transactions);
        renderExpenseCategoryChart(transactions);

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}


function renderRecentTransactions(transactions) {
    const table =
        document.getElementById("transactionsTable");

    table.innerHTML = "";

    if (transactions.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No transactions yet.
                </td>
            </tr>
        `;

        return;
    }

    const recentTransactions =
        transactions
            .slice()
            .sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            })
            .slice(0, 5);

    recentTransactions.forEach(transaction => {
        const row = document.createElement("tr");

        const amountSign =
            transaction.type === "income"
                ? "+"
                : "-";

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
}


function renderCashFlowChart(transactions) {
    const canvas =
        document.getElementById("cashFlowChart");

    if (!canvas) {
        return;
    }

    const totalsByDate = {};

    transactions.forEach(transaction => {
        const transactionDate = transaction.date;

        if (!totalsByDate[transactionDate]) {
            totalsByDate[transactionDate] = {
                income: 0,
                expense: 0
            };
        }

        if (transaction.type === "income") {
            totalsByDate[transactionDate].income +=
                transaction.amount;
        }

        if (transaction.type === "expense") {
            totalsByDate[transactionDate].expense +=
                transaction.amount;
        }
    });

    const dates =
        Object.keys(totalsByDate).sort();

    const incomeValues =
        dates.map(date =>
            totalsByDate[date].income
        );

    const expenseValues =
        dates.map(date =>
            totalsByDate[date].expense
        );

    if (cashFlowChart) {
        cashFlowChart.destroy();
    }

    cashFlowChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: dates,

            datasets: [
                {
                    label: "Income",
                    data: incomeValues,
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34, 197, 94, 0.08)",
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false,
                    pointRadius: 3
                },

                {
                    label: "Expenses",
                    data: expenseValues,
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    borderWidth: 2,
                    tension: 0.35,
                    fill: false,
                    pointRadius: 3
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: "#8b92a0",
                        font: {
                            size: 10
                        }
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: "#eef0f4"
                    },

                    ticks: {
                        color: "#8b92a0",

                        callback: function (value) {
                            return `₹${value.toLocaleString()}`;
                        },

                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
}


function renderExpenseCategoryChart(transactions) {
    const canvas =
        document.getElementById("expenseCategoryChart");

    const legend =
        document.getElementById("expenseCategoryLegend");

    const totalElement =
        document.getElementById("expenseChartTotal");

    if (!canvas) {
        return;
    }

    const categoryTotals = {};

    transactions.forEach(transaction => {
        if (transaction.type !== "expense") {
            return;
        }

        if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = 0;
        }

        categoryTotals[transaction.category] +=
            transaction.amount;
    });

    const categories =
        Object.keys(categoryTotals);

    const values =
        Object.values(categoryTotals);

    const totalExpenses =
        values.reduce(
            (sum, value) => sum + value,
            0
        );

    totalElement.textContent =
        `₹${totalExpenses.toLocaleString()}`;

    if (expenseCategoryChart) {
        expenseCategoryChart.destroy();
    }

    if (categories.length === 0) {
        legend.innerHTML = `
            <p class="empty-chart-message">
                No expense data yet.
            </p>
        `;

        return;
    }

    const chartColors = [
        "#3b82f6",
        "#ef4444",
        "#f59e0b",
        "#22c55e",
        "#8b5cf6",
        "#06b6d4",
        "#ec4899",
        "#64748b"
    ];

    expenseCategoryChart =
        new Chart(canvas, {
            type: "doughnut",

            data: {
                labels: categories,

                datasets: [
                    {
                        data: values,
                        backgroundColor:
                            chartColors.slice(
                                0,
                                categories.length
                            ),
                        borderWidth: 0,
                        hoverOffset: 4
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",

                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });


    legend.innerHTML = "";

    categories.forEach(
        (category, index) => {

            const percentage =
                totalExpenses === 0
                    ? 0
                    : Math.round(
                        (
                            categoryTotals[category] /
                            totalExpenses
                        ) * 100
                    );

            const row =
                document.createElement("div");

            row.className =
                "expense-legend-row";

            row.innerHTML = `
                <span
                    class="expense-legend-color"
                    style="
                        background:
                        ${chartColors[
                            index % chartColors.length
                        ]}
                    "
                ></span>

                <span class="expense-legend-name">
                    ${category}
                </span>

                <span class="expense-legend-value">
                    ${percentage}%
                </span>
            `;

            legend.appendChild(row);
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


loadDashboard();