const API_URL = "";

const token = localStorage.getItem("access_token");

if (!token) {
    window.location.href = "login.html";
}


async function loadUser() {
    const response = await fetch(`${API_URL}/me`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        localStorage.removeItem("access_token");
        window.location.href = "login.html";
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

    const categories = await response.json();

    const incomeContainer =
        document.getElementById("incomeCategories");

    const expenseContainer =
        document.getElementById("expenseCategories");

    incomeContainer.innerHTML = "";
    expenseContainer.innerHTML = "";

    const incomeCategories = categories.filter(
        category => category.type === "income"
    );

    const expenseCategories = categories.filter(
        category => category.type === "expense"
    );


    if (incomeCategories.length === 0) {
        incomeContainer.innerHTML =
            "<p>No income categories yet.</p>";
    }

    if (expenseCategories.length === 0) {
        expenseContainer.innerHTML =
            "<p>No expense categories yet.</p>";
    }


    incomeCategories.forEach(category => {
        incomeContainer.appendChild(
            createCategoryItem(category)
        );
    });

    expenseCategories.forEach(category => {
        expenseContainer.appendChild(
            createCategoryItem(category)
        );
    });
}


function createCategoryItem(category) {

    const item = document.createElement("div");

    item.className = "category-item";

    item.innerHTML = `
        <span>${category.name}</span>

        <div class="category-actions">

            <button
                class="category-edit-button"
                data-id="${category.id}"
                data-name="${category.name}"
                data-type="${category.type}"
            >
                Edit
            </button>

            <button
                class="category-delete-button"
                data-id="${category.id}"
            >
                Delete
            </button>

        </div>
    `;

    return item;
}

document
    .getElementById("categoryForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("categoryName").value;

        const type =
            document.getElementById("categoryType").value;

        const message =
            document.getElementById("categoryMessage");

        try {
            const response = await fetch(
                `${API_URL}/categories`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: name,
                        type: type
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    message.textContent =
                        data.detail[0].msg;
                } else {
                    message.textContent =
                        data.detail || "Could not add category";
                }

                return;
            }

            message.textContent =
                "Category added successfully";

            document
                .getElementById("categoryForm")
                .reset();

            await loadCategories();

            setTimeout(function () {
                message.textContent = "";
            }, 1500);

        } catch (error) {
            console.error(error);

            message.textContent =
                "Could not connect to server";
        }
    });

document
    .getElementById("logoutButton")
    .addEventListener("click", function () {

        localStorage.removeItem("access_token");

        window.location.href = "login.html";
    });

async function initializePage() {
    await loadUser();
    await loadCategories();
}

document.addEventListener("click", async function (event) {

    if (!event.target.classList.contains("category-delete-button")) {
        return;
    }

    const categoryId = event.target.dataset.id;

    const confirmed = confirm(
        "Are you sure you want to delete this category?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/categories/${categoryId}`,
            {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(
                data.detail ||
                "Could not delete category"
            );
            return;
        }

        await loadCategories();

    } catch (error) {
        console.error(error);
        alert("Could not connect to server");
    }
});

const editCategoryModal =
    document.getElementById("editCategoryModal");

const closeCategoryModalButton =
    document.getElementById("closeCategoryModalButton");


document.addEventListener("click", function (event) {

    if (!event.target.classList.contains("category-edit-button")) {
        return;
    }

    document.getElementById("editCategoryId").value =
        event.target.dataset.id;

    document.getElementById("editCategoryName").value =
        event.target.dataset.name;

    document.getElementById("editCategoryType").value =
        event.target.dataset.type;

    editCategoryModal.classList.add("show");
});


closeCategoryModalButton.addEventListener("click", function () {
    editCategoryModal.classList.remove("show");
});

document
    .getElementById("editCategoryForm")
    .addEventListener("submit", async function (event) {

        event.preventDefault();

        const categoryId =
            document.getElementById("editCategoryId").value;

        const name =
            document.getElementById("editCategoryName").value;

        const type =
            document.getElementById("editCategoryType").value;

        const message =
            document.getElementById("editCategoryMessage");

        try {
            const response = await fetch(
                `${API_URL}/categories/${categoryId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: name,
                        type: type
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (Array.isArray(data.detail)) {
                    message.textContent =
                        data.detail[0].msg;
                } else {
                    message.textContent =
                        data.detail || "Could not update category";
                }

                return;
            }

            message.textContent =
                "Category updated successfully";

            await loadCategories();

            setTimeout(function () {
                editCategoryModal.classList.remove("show");
                message.textContent = "";
            }, 700);

        } catch (error) {
            console.error(error);

            message.textContent =
                "Could not connect to server";
        }
    });

initializePage();