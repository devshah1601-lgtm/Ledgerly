const API_URL = "";

const token =
    localStorage.getItem("access_token");

if (!token) {
    window.location.href = "/";
}


async function loadUser() {
    const response = await fetch(
        `${API_URL}/me`,
        {
            headers: {
                "Authorization":
                    `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {
        localStorage.removeItem(
            "access_token"
        );

        window.location.href = "/";

        return;
    }

    const user =
        await response.json();

    document
        .getElementById("userName")
        .textContent = user.name;

    const userInitial =
        document.getElementById(
            "userInitial"
        );

    if (userInitial && user.name) {
        userInitial.textContent =
            user.name
                .trim()
                .charAt(0)
                .toUpperCase();
    }
}


async function loadCashbook() {
    try {
        const response = await fetch(
            `${API_URL}/cashbook`,
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Could not load cashbook"
            );
        }

        const cashbook =
            await response.json();

        document
            .getElementById("openingBalance")
            .textContent =
            `₹${cashbook.opening_balance.toLocaleString()}`;

        document
            .getElementById("cashbookIncome")
            .textContent =
            `₹${cashbook.total_income.toLocaleString()}`;

        document
            .getElementById("cashbookExpenses")
            .textContent =
            `₹${cashbook.total_expenses.toLocaleString()}`;

        document
            .getElementById("closingBalance")
            .textContent =
            `₹${cashbook.closing_balance.toLocaleString()}`;


        renderCashbookEntries(
            cashbook.entries
        );

    } catch (error) {
        console.error(
            "Cashbook error:",
            error
        );
    }
}


function renderCashbookEntries(entries) {
    const table =
        document.getElementById(
            "cashbookTable"
        );

    table.innerHTML = "";

    if (entries.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5">
                    No cashbook entries yet.
                </td>
            </tr>
        `;

        return;
    }


    entries.forEach(entry => {

        const row =
            document.createElement("tr");

        const income =
            entry.type === "income"
                ? `₹${entry.amount.toLocaleString()}`
                : "—";

        const expense =
            entry.type === "expense"
                ? `₹${entry.amount.toLocaleString()}`
                : "—";

        row.innerHTML = `
            <td>
                ${entry.date}
            </td>

            <td>
                <div class="cashbook-particular">
                    <strong>
                        ${entry.description}
                    </strong>

                    <span>
                        ${entry.category}
                    </span>
                </div>
            </td>

            <td class="amount-income">
                ${income}
            </td>

            <td class="amount-expense">
                ${expense}
            </td>

            <td class="cashbook-balance">
                ₹${entry.balance.toLocaleString()}
            </td>
        `;

        table.appendChild(row);
    });
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


async function initializeCashbook() {
    await loadUser();
    await loadCashbook();
}


initializeCashbook();