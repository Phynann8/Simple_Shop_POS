# Simple Shop POS - Setup Guide

This is a lightweight Online Ordering System for small coffee shops and stalls.

## 📂 Project Structure
- `public/menu.html` -> Customer Interface (for mobile phones)
- `public/admin.html` -> Kitchen Interface (for tablet/laptop)

## 🚀 How to Run
1. **Hosting**: Since this uses Firebase, you can deploy it to Firebase Hosting or just open the files directly (Live Server recommended).
2. **Local Testing**:
   - Open `public/menu.html` in your mobile browser (or resize desktop browser).
   - Open `public/admin.html` in a separate window.
   
## 🛒 How to Use
1. **Customer**:
   - Opens Menu (simulating scanning QR code).
   - Adds "Iced Latte" and "Croissant" to cart.
   - Clicks "Cart" -> "Confirm Order".
   
2. **Kitchen**:
   - Monitors `admin.html`.
   - New order appears instantly (Real-time).
   - Click **🖨️ Print** to generate a thermal receipt (Browser Print dialog appears).
   - Click **✅ Done** to clear the order from the screen.

## 🖨️ Printing Tips
- This system uses the browser's native print function.
- In the Print Dialog, ensure **"Margins"** are set to **"None"** or "Minimum".
- Select your Thermal Printer paper size (e.g., 58mm or 80mm).

## 🔧 Customization
- Preferred: use the **Admin → Menu** section to add/edit/delete menu items (saved in Firestore `menu` collection).
- Fallback seed menu still exists in `defaultMenu` inside `script.js` for first-time setup.
- To change the branding, edit `<h1>` in `menu.html`.
