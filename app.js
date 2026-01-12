let transactions = JSON.parse(localStorage.getItem("financeTransactions")) || [];
let buyList = JSON.parse(localStorage.getItem("financeBuyList")) || [];
let balanceBank = parseFloat(localStorage.getItem("financeBalanceBank")) || 0;
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

// Navigation
const expenseView = document.getElementById("expenseView");
const buyListView = document.getElementById("buyListView");
const showExpenseBtn = document.getElementById("showExpenseBtn");
const showBuyListBtn = document.getElementById("showBuyListBtn");

// Buy List Inputs
const buyItemNameInput = document.getElementById("buyItemName");
const buyItemPriceInput = document.getElementById("buyItemPrice");
const addBuyItemBtn = document.getElementById("addBuyItemBtn");
const buyListContainer = document.getElementById("buyListContainer");
const buyListEmptyState = document.getElementById("buyListEmptyState");
const balanceBankValueEl = document.getElementById("balanceBankValue");
const addBalanceBtn = document.getElementById("addBalanceBtn");

// Modal Elements
const moneyModal = document.getElementById("moneyModal");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalBankAvailable = document.getElementById("modalBankAvailable");
const modalBalanceInfo = document.getElementById("modalBalanceInfo");
const modalChoiceSection = document.getElementById("modalChoiceSection");
const modalAmountInput = document.getElementById("modalAmountInput");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalRemoveBtn = document.getElementById("modalRemoveBtn");
const closeModalBtn = document.getElementById("closeModal");
const choiceBankBtn = document.getElementById("choiceBank");
const choiceManualBtn = document.getElementById("choiceManual");

// Celebration Modal
const celebrationModal = document.getElementById("celebrationModal");
const celebrationMessage = document.getElementById("celebrationMessage");
const celebrationExcessInfo = document.getElementById("celebrationExcessInfo");
const celebrationExcessAmount = document.getElementById("celebrationExcessAmount");
const closeCelebrationBtn = document.getElementById("closeCelebrationBtn");

// Toast System
const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = 'error') {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === 'error' ? '⚠️' : 'ℹ️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

let modalContext = {
    type: null, // 'item' or 'balance'
    itemId: null,
    source: 'manual' // 'bank' or 'manual'
};

// ===== INIT =====
function init() {
    dateInput.valueAsDate = new Date();
    rebuildCategories();
    renderTransactions();
    updateCharts();
    updateStats();
    updateFilterInfo();
    renderBuyList();
}

function persist() {
    localStorage.setItem("financeTransactions", JSON.stringify(transactions));
    localStorage.setItem("financeBuyList", JSON.stringify(buyList));
    localStorage.setItem("financeBalanceBank", balanceBank.toString());
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
        showToast("Please fill all fields with valid values.");
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

// ===== BUY LIST LOGIC =====
function addBuyItem() {
    const name = buyItemNameInput.value.trim();
    const price = parseFloat(buyItemPriceInput.value);

    if (!name || isNaN(price) || price <= 0) {
        showToast("Please enter a valid item name and price.");
        return;
    }

    const item = {
        id: Date.now(),
        name,
        price,
        saved: 0,
    };

    buyList.push(item);
    persist();
    renderBuyList();

    buyItemNameInput.value = "";
    buyItemPriceInput.value = "";
}

function deleteBuyItem(id) {
    buyList = buyList.filter((item) => item.id !== id);
    persist();
    renderBuyList();
}

function addMoneyToBuyItem(id) {
    const item = buyList.find((i) => i.id === id);
    if (!item) return;

    modalContext = { type: 'item', itemId: id, source: 'manual' };

    modalTitle.textContent = `Saving for ${item.name}`;
    modalDescription.textContent = `Target: ₹${item.price.toFixed(0)} | Already saved: ₹${item.saved.toFixed(0)}`;
    modalAmountInput.value = "";

    modalBalanceInfo.style.display = "block";
    modalBankAvailable.textContent = `₹${balanceBank.toFixed(2)}`;
    modalChoiceSection.style.display = "grid";

    selectChoice('manual');
    moneyModal.style.display = "flex";
}

function addManualBalance() {
    modalContext = { type: 'balance', itemId: null, source: 'manual' };

    modalTitle.textContent = "Refill Bank";
    modalDescription.textContent = "Add funds to your balance bank to use across items later.";
    modalAmountInput.value = "";

    modalBalanceInfo.style.display = "none";
    modalChoiceSection.style.display = "none";

    moneyModal.style.display = "flex";
}

function selectChoice(source) {
    modalContext.source = source;
    choiceBankBtn.classList.toggle('selected', source === 'bank');
    choiceManualBtn.classList.toggle('selected', source === 'manual');
}

function closeModal() {
    moneyModal.style.display = "none";
}

function confirmModal(isRemoval = false) {
    const amount = parseFloat(modalAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        showToast("Please enter a valid amount.");
        return;
    }

    if (modalContext.type === "item") {
        const item = buyList.find(i => i.id === modalContext.itemId);
        if (isRemoval) {
            if (amount > item.saved) {
                showToast("Cannot remove more than what is saved!");
                return;
            }
            item.saved -= amount;
        } else {
            if (modalContext.source === "bank") {
                if (amount > balanceBank) {
                    showToast("Insufficient bank balance!");
                    return;
                }
                balanceBank -= amount;
            }
            item.saved += amount;
            
            if (item.saved >= item.price) {
                const excess = item.saved - item.price;
                showCelebration(item.name, excess);
                deleteBuyItem(item.id);
                if (excess > 0) {
                    balanceBank += excess;
                }
            }
        }
    } else if (modalContext.type === "balance") {
        if (isRemoval) {
            if (amount > balanceBank) {
                showToast("Insufficient bank balance!");
                return;
            }
            balanceBank -= amount;
        } else {
            balanceBank += amount;
        }
    }

    persist();
    renderBuyList();
    updateBalanceDisplay();
    closeModal();
}

function showCelebration(itemName, excess) {
    celebrationMessage.textContent = `You've successfully saved up for your ${itemName}! Every penny counts.`;
    if (excess > 0) {
        celebrationExcessInfo.style.display = "block";
        celebrationExcessAmount.textContent = `₹${excess.toFixed(2)}`;
    } else {
        celebrationExcessInfo.style.display = "none";
    }
    celebrationModal.style.display = "flex";
}

function closeCelebration() {
    celebrationModal.style.display = "none";
}

function updateBalanceDisplay() {
    if (balanceBankValueEl) {
        balanceBankValueEl.textContent = `₹${balanceBank.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        })}`;
    }
}

function renderBuyList() {
    updateBalanceDisplay();
    if (!buyList.length) {
        buyListEmptyState.style.display = "block";
        buyListContainer.innerHTML = "";
        return;
    }

    buyListEmptyState.style.display = "none";
    buyListContainer.innerHTML = buyList
        .map(
            (item) => {
                const percent = Math.min(100, (item.saved / item.price) * 100);
                return `
                <div class="buy-item">
                    <div class="buy-item-info">
                        <span class="buy-item-name">${item.name}</span>
                        <span class="buy-item-price">₹${item.saved.toLocaleString()} / ₹${item.price.toLocaleString()}</span>
                    </div>
                    <div class="buy-item-progress-row">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${percent}%"></div>
                        </div>
                        <div class="progress-label">${percent.toFixed(1)}% complete</div>
                    </div>
                    <div class="buy-item-actions">
                        <button class="add-money-inline-btn" onclick="addMoneyToBuyItem(${item.id})">Manage Money</button>
                        <button class="delete-buy-btn" onclick="event.stopPropagation(); deleteBuyItem(${item.id})"><span></span></button>
                    </div>
                </div>
            `;
            }
        )
        .join("");
}

// ===== NAVIGATION =====
function switchView(view) {
    if (view === "expense") {
        expenseView.style.display = "block";
        buyListView.style.display = "none";
        showExpenseBtn.classList.add("active");
        showBuyListBtn.classList.remove("active");
    } else {
        expenseView.style.display = "none";
        buyListView.style.display = "block";
        showExpenseBtn.classList.remove("active");
        showBuyListBtn.classList.add("active");
    }
}

// ===== EVENTS =====
addTransactionBtn.addEventListener("click", addTransaction);

addBuyItemBtn.addEventListener("click", addBuyItem);
showExpenseBtn.addEventListener("click", () => switchView("expense"));
showBuyListBtn.addEventListener("click", () => switchView("buy_list"));
addBalanceBtn.addEventListener("click", addManualBalance);

closeModalBtn.addEventListener("click", closeModal);
modalConfirmBtn.addEventListener("click", () => confirmModal(false));
modalRemoveBtn.addEventListener("click", () => confirmModal(true));
choiceBankBtn.addEventListener("click", () => selectChoice('bank'));
choiceManualBtn.addEventListener("click", () => selectChoice('manual'));
closeCelebrationBtn.addEventListener("click", closeCelebration);

moneyModal.addEventListener("click", (e) => {
    if (e.target === moneyModal) closeModal();
});

celebrationModal.addEventListener("click", (e) => {
    if (e.target === celebrationModal) closeCelebration();
});

document.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        if (expenseView.style.display !== "none") addTransaction();
        else addBuyItem();
    }
});

filterCategorySelect.addEventListener("change", (e) => {
    setFilter(e.target.value);
});

// expose functions for inline onclick
window.deleteTransaction = deleteTransaction;
window.addMoneyToBuyItem = addMoneyToBuyItem;
window.deleteBuyItem = deleteBuyItem;

// ===== START =====
init();
