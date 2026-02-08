# 🛒 Technical Manual: Simple Shop POS

## 1. System Overview
**Type**: Point of Sale System (Web-based)
**Stack**: Firebase (Firestore) + Vanilla JS
**Architecture**: Dual-View Logic (Customer Kiosk Mode + Admin Kitchen Mode) sharing one codebase.

## 2. Code Logic Analysis (`public/script.js`)

### A. Architecture: View Switching
**Trigger**: checks `document.body.classList`.
**Logic**:
*   If class is `customer-view` (index.html) -> Runs `initCustomerView()`.
*   If class is `admin-view` (admin.html) -> Runs `initAdminView()`.
*   This allows shipping a single JS bundle for both "apps".

### B. Customer Logic (Cart)
**State**: `let cart = []` (In-memory).
**Functions**:
*   `addToCart(id)`: Push item or increment `qty` if exists.
*   `updateCartUI()`: Recalculates `total = sum(price * qty)`. Renders HTML list.
*   `submitOrder()`:
    1.  Reads `cart`.
    2.  Reads `tableSelect`.
    3.  Writes to Firestore `orders` collection (`status: 'new'`).
    4.  Clears local cart.

### C. Admin Logic (Real-time Kitchen Display)
**Function**: `initAdminView()`
**Listener**: `db.collection('orders').where('status', 'in', ['new', 'cooking'])`
**Logic**:
*   Uses `onSnapshot` for Real-time updates.
*   As soon as a customer submits, the Admin screen updates instantly without refresh.
*   **Ticket Printing** (`printOrder`):
    *   Fetches order details.
    *   Generates a bare-bones HTML layout: `<div class="ticket">...</div>`.
    *   Injects into `#printArea` (hidden div).
    *   Calls `window.print()`.

## 3. Data Dictionary (Firestore)

**Collection**: `orders`

| Field | Type | Description |
| :--- | :--- | :--- |
| **`table`** | string | Table number (e.g., "5"). |
| **`status`** | string | Life-cycle: `new` -> `cooking` -> `done`. |
| **`total`** | number | Grand total in USD. |
| **`timestamp`** | timestamp | Server time. |
| **`items`** | array | List of objects: `{ id, name, price, qty }`. |

## 4. Implementation Status
*   **Menu Management**: Implemented. Menu is loaded from Firestore `menu` collection and automatically seeded from `defaultMenu` when empty.
*   **Auth**: Implemented. `admin.html` is protected behind Firebase Auth (`loginOverlay`) and real-time listeners start only after login.

## 5. Remaining Improvements (Optional)
*   Restrict admin registration (remove public self-register button in production).
*   Add Firestore Security Rules for `menu` and `orders` collections.
*   Move secrets out of frontend config when deploying production variants.
