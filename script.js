const defaultMenuItems = [
	{ id: 1, name: 'Classic Burger', description: 'Grilled beef patty with lettuce and tomato', price: 120, category: 'Food', tag: 'Best seller', stock: 12 },
	{ id: 2, name: 'Chicken Sandwich', description: 'Crispy chicken with house sauce', price: 110, category: 'Food', tag: 'Popular', stock: 8 },
	{ id: 3, name: 'Iced Tea', description: 'Fresh brewed iced tea', price: 50, category: 'Drinks', tag: 'Refreshing', stock: 15 },
	{ id: 4, name: 'Lemonade', description: 'Citrus punch', price: 55, category: 'Drinks', tag: 'Fresh', stock: 10 }
];
function readStorage(key, fallback) {
	try {
		return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
	} catch {
		return fallback;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		return;
	}
}

const savedMenuItems = readStorage('posMenuItems', []);
const menuItems = savedMenuItems.length ? savedMenuItems : defaultMenuItems.map(item => ({ ...item, stock: Number.isFinite(item.stock) ? item.stock : 0 }));
if (!savedMenuItems.length) writeStorage('posMenuItems', menuItems);
let activeCategory = 'All'; let searchTerm = ''; let cart = []; let selectedPayment = 'Card'; let orderHistory = readStorage('posOrderHistory', []); let orderNumber = Math.max(1047, ...orderHistory.map(order => Number(order.id) || 0)) + 1;
const menuGrid = document.querySelector('#menuGrid'); const orderItems = document.querySelector('#orderItems'); const subtotalElement = document.querySelector('#subtotal'); const taxElement = document.querySelector('#tax'); const totalElement = document.querySelector('#total'); const checkoutTotalElement = document.querySelector('#checkoutTotal'); const checkoutButton = document.querySelector('#checkoutButton'); const paymentModal = document.querySelector('#paymentModal'); const receiptModal = document.querySelector('#receiptModal'); const addItemModal = document.querySelector('#addItemModal'); const addItemForm = document.querySelector('#addItemForm'); const addItemNameInput = document.querySelector('#addItemName'); const addItemCategoryInput = document.querySelector('#addItemCategory'); const addItemPriceInput = document.querySelector('#addItemPrice'); const editPriceModal = document.querySelector('#editPriceModal'); const editPriceForm = document.querySelector('#editPriceForm'); const editPriceNameInput = document.querySelector('#editPriceName'); const editPriceInput = document.querySelector('#editPriceInput'); const toast = document.querySelector('#toast'); const currency = value => Math.round((value + Number.EPSILON) * 100) / 100; const money = value => `₱${currency(value).toFixed(2)}`;
const cashTender = document.querySelector('#cashTender'); const cashReceivedInput = document.querySelector('#cashReceived'); const cashChangeElement = document.querySelector('#cashChange');
const historyModal = document.querySelector('#historyModal'); const historyContent = document.querySelector('#historyContent');
const reportsModal = document.querySelector('#reportsModal'); const reportsContent = document.querySelector('#reportsContent');
const saveMenuItems = () => writeStorage('posMenuItems', menuItems);
const appView = document.querySelector('#appView');
const authScreen = document.querySelector('#authScreen');
const authForm = document.querySelector('#authForm');
const authUsername = document.querySelector('#authUsername');
const authPassword = document.querySelector('#authPassword');
const authSubmit = document.querySelector('#authSubmit');
const authSwitch = document.querySelector('#authSwitch');
const authError = document.querySelector('#authError');
const authRole = document.querySelector('#authRole');
const orderPanel = document.querySelector('.order-panel');
let signupMode = false;
let currentRole = 'admin';
let currentUsername = 'Guest';

function getAvailableStockForItem(itemId) {
	const cartCount = cart.filter(cartItem => cartItem.id === itemId).reduce((sum, cartItem) => sum + cartItem.quantity, 0);
	const item = menuItems.find(menuItem => menuItem.id === itemId);
	if (!item) return 0;
	return Math.max(0, Number(item.stock || 0) - cartCount);
}

function renderMenu() {
	const filteredItems = menuItems.filter(item => {
		const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
		return matchesCategory && `${item.name} ${item.description}`.toLowerCase().includes(searchTerm.toLowerCase());
	});
	menuGrid.innerHTML = filteredItems.length ? filteredItems.map(item => {
		const stockLeft = getAvailableStockForItem(item.id);
		const outOfStock = stockLeft <= 0;
		const addButton = currentRole === 'admin'
			? ''
			: `<button class="add-button" type="button" data-add="${item.id}" aria-label="Add ${item.name}" ${outOfStock ? 'disabled' : ''}>+</button>`;
		return `<article class="menu-card"><div class="menu-card-content"><div><h3>${item.name}</h3><p>${item.description}</p>${item.tag ? `<small>${item.tag}</small>` : ''}<div class="card-meta"><span class="stock-tag ${outOfStock ? 'out' : ''}">${outOfStock ? 'Out of stock' : `${stockLeft} left`}</span></div></div><div class="card-bottom"><strong>${money(item.price)}</strong><div class="card-actions">${currentRole === 'admin' ? `<button class="price-button" type="button" data-edit-price="${item.id}">Edit price</button><button class="price-button remove-button" type="button" data-remove-item="${item.id}">Remove</button>` : ''}${addButton}</div></div></div></article>`;
	}).join('') : '<p class="menu-empty">No menu items yet. Use Add item to create one.</p>';
}
function renderOrder() {
	if (!cart.length) orderItems.innerHTML = '<div class="empty-order"><span>＋</span><strong>Your order is empty</strong><p>Add something delicious from the menu.</p></div>'; else orderItems.innerHTML = cart.map(item => `<div class="order-line"><div class="order-line-main"><div><strong>${item.name}</strong><small>${money(item.price)} each</small></div></div><div class="quantity-control"><button type="button" data-decrease="${item.id}" aria-label="Decrease ${item.name}">−</button><b>${item.quantity}</b><button type="button" data-increase="${item.id}" aria-label="Increase ${item.name}">+</button></div><strong class="line-price">${money(item.price * item.quantity)}</strong></div>`).join('');
	const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); const tax = currency(subtotal * 0.0825); const total = currency(subtotal + tax); subtotalElement.textContent = money(subtotal); taxElement.textContent = money(tax); totalElement.textContent = money(total); checkoutTotalElement.textContent = money(total); checkoutButton.disabled = !cart.length;
}
function addToCart(id) {
	const item = menuItems.find(menuItem => menuItem.id === id);
	if (!item) return;
	const cartCount = cart.filter(cartItem => cartItem.id === id).reduce((sum, cartItem) => sum + cartItem.quantity, 0);
	if (cartCount >= Number(item.stock || 0)) {
		showToast(`${item.name} is out of stock`);
		return;
	}
	const existing = cart.find(cartItem => cartItem.id === id);
	if (existing) existing.quantity += 1; else cart.push({ ...item, quantity: 1 });
	renderMenu();
	renderOrder();
	showToast(`${item.name} added to order`);
}
function changeQuantity(id, amount) { const item = cart.find(cartItem => cartItem.id === id); if (!item) return; item.quantity += amount; cart = cart.filter(cartItem => cartItem.quantity > 0); renderMenu(); renderOrder(); }
let editingPriceId = null;
function openEditPriceModal(id) {
	const item = menuItems.find(menuItem => menuItem.id === id);
	if (!item || !editPriceModal) return;
	editingPriceId = id;
	editPriceNameInput.value = item.name;
	editPriceInput.value = item.price.toFixed(2);
	editPriceModal.classList.add('visible');
	editPriceModal.setAttribute('aria-hidden', 'false');
	window.setTimeout(() => editPriceInput.focus(), 50);
}
function closeEditPriceModal() {
	if (!editPriceModal) return;
	editPriceModal.classList.remove('visible');
	editPriceModal.setAttribute('aria-hidden', 'true');
	editPriceForm.reset();
	editingPriceId = null;
}
function savePriceEdit() {
	if (editingPriceId === null) return;
	const item = menuItems.find(menuItem => menuItem.id === editingPriceId);
	if (!item) return;
	const newPrice = Number(editPriceInput.value);
	if (!Number.isFinite(newPrice) || newPrice < 0) {
		showToast('Enter a valid price');
		editPriceInput.focus();
		return;
	}
	item.price = Math.round(newPrice * 100) / 100;
	cart.filter(cartItem => cartItem.id === editingPriceId).forEach(cartItem => { cartItem.price = item.price; });
	saveMenuItems();
	renderMenu();
	renderOrder();
	closeEditPriceModal();
	showToast(`${item.name} price updated`);
}
function editPrice(id) {
	openEditPriceModal(id);
}
function openAddItemModal() {
	if (!addItemModal) return;
	addItemForm.reset();
	addItemCategoryInput.value = 'Food';
	addItemModal.classList.add('visible');
	addItemModal.setAttribute('aria-hidden', 'false');
	window.setTimeout(() => addItemNameInput.focus(), 50);
}
function closeAddItemModal() {
	if (!addItemModal) return;
	addItemModal.classList.remove('visible');
	addItemModal.setAttribute('aria-hidden', 'true');
	addItemForm.reset();
}
function addItem() {
	const name = addItemNameInput.value.trim();
	const category = addItemCategoryInput.value;
	const price = Number(addItemPriceInput.value);
	const stock = Number(document.querySelector('#addItemStock').value);
	if (!name) {
		showToast('Enter an item name');
		addItemNameInput.focus();
		return;
	}
	if (!Number.isFinite(price) || price < 0) {
		showToast('Enter a valid price');
		addItemPriceInput.focus();
		return;
	}
	if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
		showToast('Enter a valid stock quantity');
		document.querySelector('#addItemStock').focus();
		return;
	}
	menuItems.push({ id: Date.now(), name, description: '', price: Math.round(price * 100) / 100, category, tag: '', stock: stock });
	saveMenuItems();
	renderMenu();
	closeAddItemModal();
	showToast(`${name} added to menu`);
}
function removeItem(id) {
	const item = menuItems.find(menuItem => menuItem.id === id);
	if (!item || !window.confirm(`Remove ${item.name} from the menu?`)) return;
	menuItems.splice(menuItems.findIndex(menuItem => menuItem.id === id), 1);
	cart = cart.filter(cartItem => cartItem.id !== id);
	saveMenuItems();
	renderMenu();
	renderOrder();
	showToast(`${item.name} removed`);
}
function showToast(message) { toast.textContent = message; toast.classList.add('visible'); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 2200); }
function openPayment() { const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); const total = currency(subtotal + currency(subtotal * 0.0825)); document.querySelector('#modalTotal').textContent = money(total); cashReceivedInput.value = total.toFixed(2); cashReceivedInput.min = total.toFixed(2); updateCashChange(total); cashTender.hidden = selectedPayment !== 'Cash'; paymentModal.classList.add('visible'); paymentModal.setAttribute('aria-hidden', 'false'); }
function closePayment() { paymentModal.classList.remove('visible'); paymentModal.setAttribute('aria-hidden', 'true'); }
function updateCashChange(total) { const amountReceived = currency(Number(cashReceivedInput.value) || 0); cashChangeElement.textContent = money(Math.max(0, currency(amountReceived - total))); }
menuGrid.addEventListener('click', event => { const addButton = event.target.closest('[data-add]'); const priceButton = event.target.closest('[data-edit-price]'); const removeButton = event.target.closest('[data-remove-item]'); if (addButton) addToCart(Number(addButton.dataset.add)); if (priceButton) editPrice(Number(priceButton.dataset.editPrice)); if (removeButton) removeItem(Number(removeButton.dataset.removeItem)); });
document.querySelector('#addItemButton').addEventListener('click', openAddItemModal);
addItemForm.addEventListener('submit', event => {
	event.preventDefault();
	addItem();
});
document.querySelector('#closeAddItemButton').addEventListener('click', closeAddItemModal);
document.querySelector('#cancelAddItemButton').addEventListener('click', closeAddItemModal);
addItemModal.addEventListener('click', event => { if (event.target === addItemModal) closeAddItemModal(); });
editPriceForm.addEventListener('submit', event => {
	event.preventDefault();
	savePriceEdit();
});
document.querySelector('#closeEditPriceButton').addEventListener('click', closeEditPriceModal);
document.querySelector('#cancelEditPriceButton').addEventListener('click', closeEditPriceModal);
editPriceModal.addEventListener('click', event => { if (event.target === editPriceModal) closeEditPriceModal(); });
orderItems.addEventListener('click', event => { const increase = event.target.closest('[data-increase]'); const decrease = event.target.closest('[data-decrease]'); if (increase) changeQuantity(Number(increase.dataset.increase), 1); if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1); });
document.querySelector('#searchInput').addEventListener('input', event => { searchTerm = event.target.value; renderMenu(); });
document.querySelectorAll('.category-tab').forEach(button => button.addEventListener('click', () => { activeCategory = button.dataset.category; document.querySelectorAll('.category-tab').forEach(tab => tab.classList.toggle('active', tab === button)); renderMenu(); }));
document.querySelector('#clearOrderButton').addEventListener('click', () => { if (!cart.length) return; cart = []; renderOrder(); showToast('Order cleared'); });
checkoutButton.addEventListener('click', openPayment); document.querySelector('#closeModalButton').addEventListener('click', closePayment); paymentModal.addEventListener('click', event => { if (event.target === paymentModal) closePayment(); });
document.querySelectorAll('.payment-method').forEach(button => button.addEventListener('click', () => { selectedPayment = button.dataset.method; document.querySelectorAll('.payment-method').forEach(method => method.classList.toggle('active', method === button)); cashTender.hidden = selectedPayment !== 'Cash'; }));
cashReceivedInput.addEventListener('input', () => { const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); updateCashChange(currency(subtotal + currency(subtotal * 0.0825))); });
function showReceipt(orderId, items, paymentMethod, amountPaid, change) {
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const tax = currency(subtotal * 0.0825);
	const total = currency(subtotal + tax);
	const itemRows = items.map(item => `<div class="receipt-row"><span>${item.quantity} × ${item.name}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join('');
	document.querySelector('#receiptContent').innerHTML = `<div class="receipt-meta"><span>Order #${orderId}</span><span>${new Date().toLocaleString()}</span></div><div class="receipt-items">${itemRows}</div><div class="receipt-summary"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Tax (8.25%)</span><strong>${money(tax)}</strong></div><div class="receipt-total"><span>Total purchased</span><strong>${money(total)}</strong></div><div><span>Amount paid</span><strong>${money(amountPaid)}</strong></div><div><span>Change</span><strong>${money(change)}</strong></div></div><p class="receipt-payment">Paid by ${paymentMethod}</p>`;
	receiptModal.classList.add('visible');
	receiptModal.setAttribute('aria-hidden', 'false');
}

function closeReceipt() {
	receiptModal.classList.remove('visible');
	receiptModal.setAttribute('aria-hidden', 'true');
}

function renderInventory() {
	const inventoryContent = document.querySelector('#inventoryContent');
	if (!inventoryContent) return;
	if (!menuItems.length) {
		inventoryContent.innerHTML = '<p class="history-empty">No menu items available yet.</p>';
		return;
	}
	inventoryContent.innerHTML = menuItems.map(item => `
		<div class="inventory-row">
			<div>
				<strong>${item.name}</strong>
				<small>${item.category}</small>
			</div>
			<div class="inventory-controls">
				<label>
					Stock
					<input type="number" min="0" step="1" value="${Number(item.stock || 0)}" data-stock-input="${item.id}">
				</label>
				<button class="confirm-button" type="button" data-update-stock="${item.id}">Update</button>
			</div>
		</div>
	`).join('');
}

function openInventory() {
	renderInventory();
	const inventoryModal = document.querySelector('#inventoryModal');
	if (!inventoryModal) return;
	inventoryModal.classList.add('visible');
	inventoryModal.setAttribute('aria-hidden', 'false');
}

function closeInventory() {
	const inventoryModal = document.querySelector('#inventoryModal');
	if (!inventoryModal) return;
	inventoryModal.classList.remove('visible');
	inventoryModal.setAttribute('aria-hidden', 'true');
}

function updateStock(itemId, value) {
	const item = menuItems.find(menuItem => menuItem.id === itemId);
	if (!item) return;
	const nextStock = Number(value);
	if (!Number.isFinite(nextStock) || nextStock < 0 || !Number.isInteger(nextStock)) {
		showToast('Enter a valid stock amount');
		return;
	}
	item.stock = nextStock;
	saveMenuItems();
	renderMenu();
	renderInventory();
	showToast(`${item.name} stock updated`);
}

function renderHistory() {
	const visibleOrders = currentRole === 'admin'
		? orderHistory.slice()
		: orderHistory.filter(order => order.customer === currentUsername);
	document.querySelector('#historyTitle').textContent = currentRole === 'admin' ? 'All cashier order history' : 'Order history';
	if (!visibleOrders.length) {
		historyContent.innerHTML = currentRole === 'admin'
			? '<p class="history-empty">No completed orders yet for any cashier.</p>'
			: '<p class="history-empty">No completed orders yet.</p>';
		return;
	}
	historyContent.innerHTML = visibleOrders.slice().reverse().map(order => `<article class="history-order"><div><strong>Order #${order.id}</strong><small>${order.customer || 'Cashier'} · ${order.time} · ${order.payment}</small></div><b>${money(order.total)}</b><p>${order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</p></article>`).join('');
}

function buildSalesReport() {
	const orders = orderHistory.slice();
	const totalSales = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
	const totalOrders = orders.length;
	const totalItemsSold = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0);
	const paymentSummary = orders.reduce((summary, order) => {
		summary[order.payment] = (summary[order.payment] || 0) + (Number(order.total) || 0);
		return summary;
	}, {});
	const itemSummary = orders.reduce((summary, order) => {
		order.items.forEach(item => {
			summary[item.name] = (summary[item.name] || 0) + Number(item.quantity || 0);
		});
		return summary;
	}, {});
	const topItemEntries = Object.entries(itemSummary).sort((a, b) => b[1] - a[1]);
	const topItem = topItemEntries[0];
	const averageOrder = totalOrders ? totalSales / totalOrders : 0;
	const paymentRows = Object.entries(paymentSummary).map(([method, value]) => `<div class="report-row"><span>${method}</span><strong>${money(value)}</strong></div>`).join('');
	const itemRows = topItemEntries.slice(0, 5).map(([name, qty]) => `<div class="report-row"><span>${name}</span><strong>${qty} sold</strong></div>`).join('') || '<div class="report-row"><span>No sales yet</span><strong>0</strong></div>';
	return `
		<div class="report-overview">
			<div class="report-card"><small>Total sales</small><strong>${money(totalSales)}</strong></div>
			<div class="report-card"><small>Orders</small><strong>${totalOrders}</strong></div>
			<div class="report-card"><small>Items sold</small><strong>${totalItemsSold}</strong></div>
			<div class="report-card"><small>Avg. order</small><strong>${money(averageOrder)}</strong></div>
		</div>
		<div class="report-section">
			<h3>Top item</h3>
			<div class="report-row"><span>${topItem ? topItem[0] : 'No sales yet'}</span><strong>${topItem ? `${topItem[1]} units` : '0'}</strong></div>
		</div>
		<div class="report-section">
			<h3>Payment breakdown</h3>
			<div class="report-breakdown">${paymentRows || '<div class="report-row"><span>No payments recorded</span><strong>₱0.00</strong></div>'}</div>
		</div>
		<div class="report-section">
			<h3>Best sellers</h3>
			<div class="report-breakdown">${itemRows}</div>
		</div>
	`;
}

function openReports() {
	reportsContent.innerHTML = buildSalesReport();
	reportsModal.classList.add('visible');
	reportsModal.setAttribute('aria-hidden', 'false');
}

function closeReports() {
	reportsModal.classList.remove('visible');
	reportsModal.setAttribute('aria-hidden', 'true');
}

function openHistory() {
	renderHistory();
	historyModal.classList.add('visible');
	historyModal.setAttribute('aria-hidden', 'false');
}

function closeHistory() {
	historyModal.classList.remove('visible');
	historyModal.setAttribute('aria-hidden', 'true');
}

document.querySelector('#confirmPaymentButton').addEventListener('click', () => {
	const paidOrder = orderNumber;
	const completedItems = cart.map(item => ({ ...item }));
	const subtotal = completedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const total = currency(subtotal + currency(subtotal * 0.0825));
	const amountPaid = selectedPayment === 'Cash' ? currency(Number(cashReceivedInput.value) || 0) : total;
	if (amountPaid < total) { showToast('Amount received must cover the total'); return; }
	const change = currency(amountPaid - total);
	completedItems.forEach(item => {
		const menuItem = menuItems.find(menuEntry => menuEntry.id === item.id);
		if (menuItem) menuItem.stock = Math.max(0, Number(menuItem.stock || 0) - item.quantity);
	});
	orderHistory.push({ id: paidOrder, customer: currentUsername, role: currentRole, items: completedItems, total, amountPaid, change, payment: selectedPayment, time: new Date().toLocaleString() });
	writeStorage('posOrderHistory', orderHistory);
	saveMenuItems();
	cart = [];
	renderMenu();
	renderOrder();
	closePayment();
	showReceipt(paidOrder, completedItems, selectedPayment, amountPaid, change);
	orderNumber += 1;
	document.querySelector('#orderNumber').textContent = `#${orderNumber}`;
});
document.querySelector('#closeReceiptButton').addEventListener('click', closeReceipt);
document.querySelector('#doneReceiptButton').addEventListener('click', closeReceipt);
document.querySelector('#printReceiptButton').addEventListener('click', () => window.print());
receiptModal.addEventListener('click', event => { if (event.target === receiptModal) closeReceipt(); });
document.querySelector('#inventoryButton').addEventListener('click', openInventory);
document.querySelector('#closeInventoryButton').addEventListener('click', closeInventory);
document.querySelector('#inventoryModal').addEventListener('click', event => { if (event.target === document.querySelector('#inventoryModal')) closeInventory(); });
document.querySelector('#inventoryContent').addEventListener('click', event => {
	const button = event.target.closest('[data-update-stock]');
	if (!button) return;
	const itemId = Number(button.dataset.updateStock);
	const input = document.querySelector(`[data-stock-input="${itemId}"]`);
	if (!input) return;
	updateStock(itemId, input.value);
});
document.querySelector('#reportsButton').addEventListener('click', openReports);
document.querySelector('#closeReportsButton').addEventListener('click', closeReports);
document.querySelector('#printReportButton').addEventListener('click', () => window.print());
document.querySelector('#reportsModal').addEventListener('click', event => { if (event.target === document.querySelector('#reportsModal')) closeReports(); });
document.querySelector('#historyButton').addEventListener('click', openHistory);
document.querySelector('#customerHistoryButton').addEventListener('click', openHistory);
document.querySelector('#closeHistoryButton').addEventListener('click', closeHistory);
historyModal.addEventListener('click', event => { if (event.target === historyModal) closeHistory(); });

function setAuthError(message) {
	authError.textContent = message;
}

function openMenuForRole(role, username) {
	currentRole = role === 'admin' ? 'admin' : 'customer';
	currentUsername = username || 'Guest';
	authScreen.hidden = true;
	appView.hidden = false;
	appView.classList.toggle('customer-mode', currentRole === 'customer');
	appView.classList.toggle('admin-mode', currentRole === 'admin');
	document.querySelectorAll('.admin-only').forEach(element => { element.hidden = currentRole !== 'admin'; });
	document.querySelectorAll('.customer-only').forEach(element => { element.hidden = currentRole !== 'customer'; });
	if (orderPanel) orderPanel.hidden = currentRole !== 'customer';
	document.querySelector('#orderLabel').textContent = currentRole === 'customer' ? 'Your cart' : 'Current ticket';
	document.querySelector('#orderTitle').textContent = currentRole === 'customer' ? 'Cart' : 'Order';
	document.querySelector('#welcomeTitle').textContent = currentRole === 'customer' ? `Welcome, ${username}` : `Hello, ${username}`;
	renderMenu();
	renderOrder();
}

authSwitch.addEventListener('click', () => {
	signupMode = !signupMode;
	document.querySelector('#authTitle').textContent = signupMode ? 'Sign up' : 'Log in';
	document.querySelector('#authMessage').textContent = signupMode ? 'Create an account to manage the menu and orders.' : 'Log in to manage the menu and orders.';
	authSubmit.textContent = signupMode ? 'Sign up' : 'Log in';
	authSwitch.textContent = signupMode ? 'Already have an account? Log in' : 'Need an account? Sign up';
	setAuthError('');
});

authForm.addEventListener('submit', event => {
	event.preventDefault();
	const username = authUsername.value.trim();
	const password = authPassword.value;
	const selectedRole = authRole.value;
	if (!username || !password) return;
	openMenuForRole(selectedRole, username);
	authForm.reset();
	setAuthError('');
	showToast(signupMode ? 'Account created' : 'You are signed in');
});

document.querySelector('#logoutButton').addEventListener('click', () => {
	appView.hidden = true;
	authScreen.hidden = false;
	appView.classList.remove('customer-mode', 'admin-mode');
	document.querySelectorAll('.admin-only').forEach(element => { element.hidden = false; });
	document.querySelectorAll('.customer-only').forEach(element => { element.hidden = true; });
	if (orderPanel) orderPanel.hidden = true;
	signupMode = false;
	document.querySelector('#authTitle').textContent = 'Log in';
	document.querySelector('#authMessage').textContent = 'Log in to manage the menu and orders.';
	authSubmit.textContent = 'Log in';
	authSwitch.textContent = 'Need an account? Sign up';
	showToast('You have been logged out');
});

renderMenu(); renderOrder();