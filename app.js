// ===== DATA + STATE =====
let transactions = JSON.parse(localStorage.getItem("financeTransactions")) || [];
let categories = [...new Set(transactions.map((t) => t.category))];

// "__all__" means no filter
let currentFilterCategory = "__all__";

// charts
let categoryChart;
let monthlyChart;

// ===== DOM REFERENCES =====
const dateInput = document.getElementById("dateInput");
const amountInput = document.getElementById("amountInput");
const categorySelect = document.getElementById("categorySelect");
const newCategoryInput = document.getElementById("newCategoryInput");
const addTransactionBtn = document.getElementById("addTransactionBtn");

const filterCategorySelect = document.getElementById("filterCategorySelect");
const filterInfo = document.getElementById("filterInfo");
const categoriesList = document.getElementById("categoriesList");

const transactionsBody = document.getElementById("transactionsBody");
const emptyState = document.getElementById("emptyState");
const totalSpentEl = document.getElementById("totalSpent");
const currentMonthEl = document.getElementById("currentMonth");

const categoryChartTitle = document.getElementById("categoryChartTitle");
const categoryChartChip = document.getElementById("categoryChartChip");
const monthlyChartTitle = document.getElementById("monthlyChartTitle");
const monthlyChartChip = document.getElementById("monthlyChartChip");

const categoryCtx = document.getElementById("categoryChart").getContext("2d");
const monthlyCtx = document.getElementById("monthlyChart").getContext("2d");

// ===== INIT =====
function init() {
    dateInput.valueAsDate = new Date();
    rebuildCategories();
    renderTransactions();
    updateCharts();
    updateStats();
    updateFilterInfo();
}

function persist() {
    localStorage.setItem("financeTransactions", JSON.stringify(transactions));
}

// ===== CATEGORY MANAGEMENT =====
function rebuildCategories() {
    categories = [...new Set(transactions.map((t) => t.category))];

    // main category select (for adding tx)
    categorySelect.innerHTML = '<option value="">Select existing</option>';
    categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    // filter select
    filterCategorySelect.innerHTML = '<option value="__all__">All categories</option>';
    categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        filterCategorySelect.appendChild(option);
    });

    // if the filter category got deleted, reset to all
    if (currentFilterCategory !== "__all__" && !categories.includes(currentFilterCategory)) {
        currentFilterCategory = "__all__";
    }
    filterCategorySelect.value = currentFilterCategory;

    // chips row
    renderCategoryChips();
}

function renderCategoryChips() {
    categoriesList.innerHTML = "";
    if (!categories.length) return;

    categories.forEach((cat) => {
        const chip = document.createElement("div");
        chip.className = "category-chip";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = cat;

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "<span>Del</span>";
        deleteBtn.addEventListener("click", () => deleteCategory(cat));

        chip.appendChild(labelSpan);
        chip.appendChild(deleteBtn);

        categoriesList.appendChild(chip);
    });
}

function deleteCategory(categoryName) {
    if (!confirm(`Delete category "${categoryName}" and all its transactions?`)) {
        return;
    }
    // remove its transactions
    transactions = transactions.filter((t) => t.category !== categoryName);
    persist();
    rebuildCategories();
    renderTransactions();
    updateCharts();
    updateStats();
    updateFilterInfo();
}

// ===== ADD / DELETE TRANSACTION =====
function addTransaction() {
    const date = dateInput.value;
    const amount = parseFloat(amountInput.value);
    const selectedCategory = categorySelect.value;
    const newCategory = newCategoryInput.value.trim();

    if (!date || (!selectedCategory && !newCategory) || !amount || amount <= 0) {
        alert("Please fill all fields with valid values.");
        return;
    }

    const category = selectedCategory || newCategory;

    const tx = {
        id: Date.now(),
        date,
        category,
        amount,
    };

    transactions.unshift(tx);
    persist();

    // reset inputs
    amountInput.value = "";
    newCategoryInput.value = "";
    categorySelect.value = "";

    rebuildCategories();
    renderTransactions();
    updateCharts();
    updateStats();
    updateFilterInfo();
}

function deleteTransaction(id) {
    transactions = transactions.filter((t) => t.id !== id);
    persist();
    rebuildCategories();
    renderTransactions();
    updateCharts();
    updateStats();
    updateFilterInfo();
}

// ===== FILTER HANDLING =====
function setFilter(categoryValue) {
    currentFilterCategory = categoryValue;
    updateFilterInfo();
    renderTransactions();
    updateCharts();
    updateStats();
}

function updateFilterInfo() {
    if (currentFilterCategory === "__all__") {
        filterInfo.textContent = "Showing: All categories";
        categoryChartTitle.textContent = "Spending by Category";
        categoryChartChip.textContent = "All time • All categories";
        monthlyChartTitle.textContent = "Monthly Spending Trend";
        monthlyChartChip.textContent = "All months • All categories";
    } else {
        filterInfo.textContent = `Showing: ${currentFilterCategory}`;
        categoryChartTitle.textContent = `Spending by Category (${currentFilterCategory})`;
        categoryChartChip.textContent = `${currentFilterCategory} • All time`;
        monthlyChartTitle.textContent = `Monthly Spending (${currentFilterCategory})`;
        monthlyChartChip.textContent = `${currentFilterCategory} • All months`;
    }
}

// ===== RENDER TABLE =====
function getFilteredTransactions() {
    if (currentFilterCategory === "__all__") return transactions;
    return transactions.filter((t) => t.category === currentFilterCategory);
}

function renderTransactions() {
    const txs = getFilteredTransactions();

    if (!txs.length) {
        transactionsBody.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }
    emptyState.style.display = "none";

    transactionsBody.innerHTML = txs
        .map(
            (t) => `
        <tr>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${t.category}</td>
            <td>₹${t.amount.toFixed(2)}</td>
            <td>
                <button class="delete-tx-btn" onclick="deleteTransaction(${t.id})">
                    Delete
                </button>
            </td>
        </tr>
    `
        )
        .join("");
}

// ===== AGGREGATIONS =====
function getCategoryData() {
    const txs = getFilteredTransactions();

    // if a specific category is selected, pie chart becomes "sub-breakdown" by month
    if (currentFilterCategory !== "__all__") {
        const monthly = {};
        txs.forEach((t) => {
            const key = t.date.slice(0, 7);
            monthly[key] = (monthly[key] || 0) + t.amount;
        });
        const labels = Object.keys(monthly).sort();
        const data = labels.map((k) => monthly[k]);
        return { labels, data, isByMonth: true };
    }

    // all categories: standard breakdown
    const totals = {};
    txs.forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(totals);
    const data = labels.map((l) => totals[l]);
    return { labels, data, isByMonth: false };
}

function getMonthlyData() {
    const txs = getFilteredTransactions();

    const monthly = {};
    txs.forEach((t) => {
        const key = t.date.slice(0, 7); // YYYY-MM
        monthly[key] = (monthly[key] || 0) + t.amount;
    });

    const labels = Object.keys(monthly).sort();
    const data = labels.map((l) => monthly[l]);
    return { labels, data };
}

// ===== CHARTS =====
function updateCharts() {
    const catData = getCategoryData();
    const monthData = getMonthlyData();

    // category pie chart
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryCtx, {
        type: "pie",
        data: {
            labels: catData.labels,
            datasets: [{
                data: catData.data,
                backgroundColor: ["#22c55e", "#3b82f6", "#f97316"],
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        },
    });

    // monthly line chart
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(monthlyCtx, {
        type: "line",
        data: {
            labels: monthData.labels,
            datasets: [{
                label: "Monthly Spending",
                data: monthData.data,
                borderColor: "#22c55e",
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        },
    });
}

// ===== STATS =====
function updateStats() {
    const txs = getFilteredTransactions();

    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    const thisMonthKey = new Date().toISOString().slice(0, 7);

    const thisMonthTotal = txs
        .filter((t) => t.date.startsWith(thisMonthKey))
        .reduce((sum, t) => sum + t.amount, 0);

    totalSpentEl.textContent = `₹${total.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
    currentMonthEl.textContent = `₹${thisMonthTotal.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
}

// ===== EVENTS =====
addTransactionBtn.addEventListener("click", addTransaction);

document.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTransaction();
});

filterCategorySelect.addEventListener("change", (e) => {
    setFilter(e.target.value);
});

// expose deleteTransaction for inline onclick
window.deleteTransaction = deleteTransaction;

// ===== START =====
init();
