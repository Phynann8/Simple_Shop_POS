/* ================= STATE & DATA ================= */
let cart = [];
let menuItems = [];

// Placeholder data for MVP until Admin is built
const defaultMenu = [
    { id: '1', name: 'Iced Latte', price: 3.50, category: 'coffee' },
    { id: '2', name: 'Cappuccino', price: 3.00, category: 'coffee' },
    { id: '3', name: 'Americano', price: 2.50, category: 'coffee' },
    { id: '4', name: 'Thai Milk Tea', price: 3.50, category: 'tea' },
    { id: '5', name: 'Green Tea', price: 3.00, category: 'tea' },
    { id: '6', name: 'Croissant', price: 2.00, category: 'food' },
    { id: '7', name: 'Sandwich', price: 5.00, category: 'food' },
];

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
    // Check which page we are on
    if (document.body.classList.contains('customer-view')) {
        initCustomerView();
    } else if (document.body.classList.contains('admin-view')) {
        initAdminView();
    }
});

/* ================= CUSTOMER VIEW LOGIC ================= */
function initCustomerView() {
    loadMenu();
    updateCartUI();
}

function loadMenu() {
    const container = document.getElementById('menuContainer');
    if (container) container.innerHTML = '<div class="loading-spinner">Loading Menu...</div>';

    // Try to load from Firestore, fallback to default if empty
    db.collection('menu').get().then(snapshot => {
        if (snapshot.empty) {
            // Seed default menu to Firestore for first run
            console.log('Seeding default menu to Firestore...');
            defaultMenu.forEach(item => {
                db.collection('menu').doc(item.id).set(item);
            });
            menuItems = defaultMenu;
        } else {
            menuItems = [];
            snapshot.forEach(doc => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });
        }
        renderMenu(menuItems);
    }).catch(error => {
        console.error('Error loading menu:', error);
        // Fallback to default on error
        menuItems = defaultMenu;
        renderMenu(menuItems);
    });
}

function renderMenu(items) {
    const container = document.getElementById('menuContainer');
    container.innerHTML = items.map(item => `
        <div class="menu-item">
            <div class="item-info">
                <h3>${item.name}</h3>
                <div class="price">$${item.price.toFixed(2)}</div>
            </div>
            <button class="add-btn" onclick="addToCart('${item.id}')">+</button>
        </div>
    `).join('');
}

function filterMenu(category) {
    // update active button
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        renderMenu(menuItems);
    } else {
        const filtered = menuItems.filter(i => i.category === category);
        renderMenu(filtered);
    }
}

/* ================= CART LOGIC ================= */
window.addToCart = function (id) {
    const item = menuItems.find(i => i.id === id);
    const existing = cart.find(c => c.id === id);

    if (existing) {
        existing.qty++;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    updateCartUI();

    // Tiny feedback animation
    const btn = event.target;
    btn.style.background = 'var(--text)';
    btn.style.color = 'white';
    setTimeout(() => {
        btn.style.background = 'var(--bg)';
        btn.style.color = 'var(--primary)';
    }, 200);
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
    const totalPrice = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    document.getElementById('cartCount').innerText = totalQty;
    document.getElementById('cartTotal').innerText = '$' + totalPrice.toFixed(2);
    document.getElementById('modalTotal').innerText = '$' + totalPrice.toFixed(2);

    // Render cart list in modal
    const list = document.getElementById('cartItems');
    if (cart.length === 0) {
        list.innerHTML = '<div class="empty-cart" style="text-align:center; padding:20px; color:var(--text-sec)">Your cart is empty</div>';
    } else {
        list.innerHTML = cart.map((item, index) => `
            <div class="menu-item" style="box-shadow:none; border-bottom:1px solid var(--border); border-radius:0;">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="price">$${(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="add-btn" style="width:28px; height:28px; font-size:16px;" onclick="adjustQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="add-btn" style="width:28px; height:28px; font-size:16px;" onclick="adjustQty(${index}, 1)">+</button>
                </div>
            </div>
        `).join('');
    }
}

window.adjustQty = function (index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

window.openCart = function () {
    document.getElementById('cartModal').classList.add('active');
}

window.closeCart = function () {
    document.getElementById('cartModal').classList.remove('active');
}

window.submitOrder = async function () {
    if (cart.length === 0) return alert("Cart is empty!");

    const tableNum = document.getElementById('tableSelect').value;
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    const orderData = {
        table: tableNum,
        items: cart,
        total: total,
        status: 'new', // new, cooking, done
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection('orders').add(orderData);
        cart = [];
        updateCartUI();
        closeCart();

        // Show success
        document.getElementById('successOrderNum').innerText = docRef.id.slice(-4).toUpperCase();
        document.getElementById('successModal').classList.add('active');
    } catch (e) {
        alert("Error sending order: " + e.message);
    }
}

/* ================= ADMIN VIEW LOGIC ================= */
/* ================= ADMIN VIEW LOGIC ================= */
let adminUnsubscribe = null;
let currentEditId = null;

function initAdminView() {
    const auth = firebase.auth();

    // Auth Listener
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginOverlay').style.display = 'none';
            // Init Real-time Listeners
            startOrderListener();
        } else {
            document.getElementById('loginOverlay').style.display = 'flex';
            // Stop listeners if any
            if (adminUnsubscribe) adminUnsubscribe();
            adminUnsubscribe = null;
        }
    });
}

// Auth Functions
window.login = function () {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');

    firebase.auth().signInWithEmailAndPassword(email, pass)
        .catch(error => {
            errorMsg.innerText = "Invalid credentials (" + error.message + ")";
            console.error(error);
        });
}

window.register = function () {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPassword').value;
    const errorMsg = document.getElementById('loginError');

    if (!email || !pass) {
        errorMsg.innerText = "Please enter email and password";
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then((userCredential) => {
            alert("Account created! Logging in...");
        })
        .catch((error) => {
            errorMsg.innerText = error.message;
        });
}

window.logout = function () {
    firebase.auth().signOut();
}

// Navigation
window.showSection = function (sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.getElementById(sectionId + 'Section').classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (sectionId === 'menu') loadAdminMenu();
    if (sectionId === 'history') loadOrderHistory();
}

/* ================= HISTORY & STATS ================= */
/* ================= HISTORY & STATS ================= */
let historyLastDoc = null;
let historyIsLoading = false;

function loadOrderHistory(reset = true) {
    if (historyIsLoading) return;
    historyIsLoading = true;

    const tbody = document.getElementById('historyTableBody');
    const loadMoreBtn = document.getElementById('btnLoadMore');

    if (reset) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center;">Loading history...</td></tr>';
        historyLastDoc = null;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }

    // Get Filter Values
    const dateFilter = document.getElementById('historyDateFilter').value;

    let query = db.collection('orders')
        .where('status', '==', 'done')
        .orderBy('timestamp', 'desc');

    if (dateFilter) {
        const start = new Date(dateFilter);
        const end = new Date(dateFilter);
        end.setDate(end.getDate() + 1);
        query = query.where('timestamp', '>=', start).where('timestamp', '<', end);
    }

    if (historyLastDoc && !reset) {
        query = query.startAfter(historyLastDoc);
    }

    query.limit(20).get().then(snapshot => {
        const orders = [];
        if (!snapshot.empty) {
            historyLastDoc = snapshot.docs[snapshot.docs.length - 1];
            snapshot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() });
            });
        }

        renderHistoryTable(orders, reset);

        // Handle Load More Button
        if (loadMoreBtn) {
            loadMoreBtn.style.display = snapshot.size < 20 ? 'none' : 'block';
        }

        historyIsLoading = false;

        // Also refresh stats when history is reloaded (optional, but good for sync)
        if (reset) loadSalesStats();
    }).catch(err => {
        console.error("Error loading history:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:20px; text-align:center; color:red;">Error loading history</td></tr>`;
        historyIsLoading = false;
    });
}

function renderHistoryTable(orders, reset) {
    const tbody = document.getElementById('historyTableBody');

    if (reset) {
        tbody.innerHTML = ''; // Clear loading message
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="padding:20px; text-align:center;">No completed orders found.</td></tr>';
            return;
        }
    }

    const html = orders.map(order => {
        const dateObj = order.timestamp ? order.timestamp.toDate() : new Date();
        return `
        <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:15px;">${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <br> <span style="font-size:0.8em; color:var(--text-sec);">${dateObj.toLocaleDateString()}</span></td>
            <td style="padding:15px;">#${order.id.slice(-4).toUpperCase()}</td>
            <td style="padding:15px;">${order.table}</td>
            <td style="padding:15px;">${order.items.map(i => i.name).join(', ')}</td>
            <td style="padding:15px; font-weight:bold;">$${order.total.toFixed(2)}</td>
            <td style="padding:15px;">
                <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem; background:var(--text-sec);" onclick="printOrder('${order.id}')">Reprint</button>
            </td>
        </tr>
    `}).join('');

    tbody.insertAdjacentHTML('beforeend', html);
}

function loadSalesStats() {
    // We will fetch last 30 days for simplicity in this MVP to avoid Reading ALL documents
    // If you have thousands of orders, you should aggregate this in a separate collection via Cloud Functions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    db.collection('orders')
        .where('status', '==', 'done')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get()
        .then(snapshot => {
            let todayTotal = 0;
            let weekTotal = 0;
            let monthTotal = 0;
            let todayCount = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);

            // For Chart
            const dailySales = {}; // "YYYY-MM-DD": total

            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? data.timestamp.toDate() : new Date();

                // Totals
                monthTotal += data.total;

                if (date >= weekStart) weekTotal += data.total;
                if (date >= today) {
                    todayTotal += data.total;
                    todayCount++;
                }

                // Chart Data
                const dateKey = date.toISOString().split('T')[0];
                dailySales[dateKey] = (dailySales[dateKey] || 0) + data.total;
            });

            document.getElementById('statTotalSales').innerText = '$' + todayTotal.toFixed(2);
            document.getElementById('statOrderCount').innerText = todayCount;
            document.getElementById('statWeeklySales').innerText = '$' + weekTotal.toFixed(2);
            document.getElementById('statMonthlySales').innerText = '$' + monthTotal.toFixed(2);

            renderSalesChart(dailySales);
        });
}

function renderSalesChart(dailyData) {
    const container = document.getElementById('salesChartContainer');
    if (!container) return;

    // Get last 7 days keys
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }

    const maxVal = Math.max(...Object.values(dailyData), 10); // avoid div by zero

    container.innerHTML = days.map(day => {
        const val = dailyData[day] || 0;
        const heightPct = (val / maxVal) * 100;
        const displayDate = new Date(day).toLocaleDateString(undefined, { weekday: 'short' });
        return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:5px; flex:1;">
                <div style="width:100%; height:100px; background:rgba(0,0,0,0.05); border-radius:8px; display:flex; align-items:flex-end; overflow:hidden;">
                    <div style="width:100%; height:${heightPct}%; background:var(--primary); border-radius:4px 4px 0 0; transition:height 0.5s ease;"></div>
                </div>
                <div style="font-size:10px; color:var(--text-sec);">${displayDate}</div>
                <div style="font-size:10px; font-weight:bold;">$${val.toFixed(0)}</div>
            </div>
        `;
    }).join('');
}

/* ================= ORDER MANAGEMENT ================= */
function startOrderListener() {
    if (adminUnsubscribe) return; // Already running

    adminUnsubscribe = db.collection('orders')
        .where('status', 'in', ['new', 'cooking'])
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            const orders = [];
            snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
            renderOrders(orders);
        });
}

function renderOrders(orders) {
    const grid = document.getElementById('ordersGrid');
    if (orders.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#aaa">No active orders</div>';
        return;
    }

    grid.innerHTML = orders.map(order => `
        <div class="order-card ${order.status}">
            <div class="order-header">
                <div>
                    <div class="order-table">Table ${order.table}</div>
                    <div class="order-time">#${order.id.slice(-4).toUpperCase()}</div>
                </div>
                <div style="font-size:24px; font-weight:700;">$${order.total.toFixed(2)}</div>
            </div>
            
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item-row">
                        <span><span class="qty-badge">x${item.qty}</span> ${item.name}</span>
                        <span>$${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-actions">
                <button class="btn-base btn-print" onclick="printOrder('${order.id}')">🖨️ Print</button>
                <button class="btn-base btn-done" onclick="completeOrder('${order.id}')">✅ Done</button>
            </div>
        </div>
    `).join('');
}

window.completeOrder = async function (orderId) {
    if (!confirm("Start cooking / Finish order?")) return;
    await db.collection('orders').doc(orderId).update({ status: 'done' });
}

window.printOrder = function (orderId) {
    db.collection('orders').doc(orderId).get().then(doc => {
        const order = doc.data();
        const date = order.timestamp ? order.timestamp.toDate().toLocaleString() : new Date().toLocaleString();

        const ticketHTML = `
            <div class="ticket">
                <div class="ticket-header">
                    <h3>Coffee Corner</h3>
                    <p>${date}</p>
                    <p>Order #${doc.id.slice(-4).toUpperCase()} - Table ${order.table}</p>
                </div>
                <div class="ticket-items">
                    ${order.items.map(i => `
                        <div class="ticket-row">
                            <span>${i.qty}x ${i.name}</span>
                            <span>${(i.price * i.qty).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="ticket-total">
                    TOTAL: $${order.total.toFixed(2)}
                </div>
                <div style="text-align:center; margin-top:10px; font-size:12px;">Thank you!</div>
            </div>
        `;
        document.getElementById('printArea').innerHTML = ticketHTML;
        window.print();
    });
}

/* ================= MENU MANAGEMENT ================= */
function loadAdminMenu() {
    const list = document.getElementById('adminMenuList');
    list.innerHTML = '<div class="loading-spinner">Loading menu...</div>';

    db.collection('menu').orderBy('name').get().then(snapshot => {
        let html = '';
        snapshot.forEach(doc => {
            const item = doc.data();
            html += `
                <div class="menu-list-item">
                    <div class="menu-list-info">
                        <div>${item.name}</div>
                        <div>${item.category}</div>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <span class="price-tag">$${item.price.toFixed(2)}</span>
                        <button class="btn-primary" style="background:var(--text-sec); font-size:12px;" 
                            onclick="openItemModal('${doc.id}', '${item.name}', '${item.category}', ${item.price})">Edit</button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    });
}

window.openItemModal = function (id = null, name = '', category = 'coffee', price = '') {
    currentEditId = id;
    document.getElementById('itemId').value = id || '';
    document.getElementById('itemName').value = name;
    document.getElementById('itemCategory').value = category;
    document.getElementById('itemPrice').value = price;

    document.getElementById('btnDelete').style.display = id ? 'block' : 'none';
    document.getElementById('itemModal').classList.add('active');
}

window.closeItemModal = function () {
    document.getElementById('itemModal').classList.remove('active');
}

window.saveMenuItem = async function () {
    const name = document.getElementById('itemName').value;
    const category = document.getElementById('itemCategory').value;
    const price = parseFloat(document.getElementById('itemPrice').value);

    if (!name || !price) return alert("Please fill details");

    const data = { name, category, price };

    try {
        if (currentEditId) {
            await db.collection('menu').doc(currentEditId).update(data);
        } else {
            await db.collection('menu').add(data);
        }
        closeItemModal();
        loadAdminMenu(); // refresh list
    } catch (e) {
        alert("Error saving: " + e.message);
    }
}

window.deleteMenuItem = async function () {
    if (!currentEditId || !confirm("Delete this item?")) return;
    try {
        await db.collection('menu').doc(currentEditId).delete();
        closeItemModal();
        loadAdminMenu();
    } catch (e) {
        alert("Error deleting: " + e.message);
    }
}
