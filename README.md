# 💳 Payment Gateway with Node.js & React

Welcome to the **Production-Ready Payment Gateway**! This project is a robust, full-stack payment processing solution designed to handle real-world scenarios like asynchronous payments, refunds, and reliable webhook delivery.

Built with **Node.js, TypeScript, PostgreSQL, Redis, and React**, it demonstrates how to build a scalable and fault-tolerant financial system.

---

## 🏗️ Architecture & Design

### System Overview
The system is composed of decoupled microservices to ensuring scalability. The **Create Order** flow initiates the process, while the **Checkout SDK** handles the sensitive payment collection, and **Workers** process the transactions asynchronously.

![System Architecture](docs/images/System%20Architecture.png)

### The Payment Lifecycle
From the moment a user clicks "Pay" to the final webhook delivery, our system ensures data integrity and proper state transitions.

![Payment Flow](docs/images/Payment%20Flow.png)

---

## 🚀 Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
*   **Docker Desktop** (Essential for running the containerized stack)
*   **Node.js 18+** (Optional, only for local development outside Docker)

### 🛠️ Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/payment-gateway.git
    cd payment-gateway
    ```

2.  **Start the Services**
    We use Docker Compose to spin up the entire stack (Backend, Frontend, Database, Redis, Workers).
    ```bash
    docker-compose up -d --build
    ```
    *Tip: The `--build` flag ensures you're running the latest code.*

3.  **Verify Deployment**
    Run `docker ps` to see the running containers. You should see:
    *   `payment-gateway-backend` (API Service)
    *   `payment-gateway-frontend` (Merchant Dashboard)
    *   `payment-gateway-checkout` (Checkout Page)
    *   `postgres` & `redis` (Infrastructure)

---

## �️ Using the Dashboard

The Merchant Dashboard is your command center. Access it at **[http://localhost:3000](http://localhost:3000)**.

### 1. Account Setup
*   Log in with any email (e.g., `merchant@example.com`). This is a demo environment, so no password is required.

### 2. Creating an Order
1.  Navigate to **Create Order**.
2.  Enter an amount (e.g., `500.00` INR).
3.  Click **Create Order**. You'll receive a unique Order ID.

### 3. Processing a Payment
1.  Click **"Pay Now (with SDK)"**.
2.  The Payment Gateway modal will appear.
3.  **Test Cards:**
    *   **Success:** Use `4242 4242 4242 4242` (Any future expiry, any CVV).
    *   **Simulated Processing Failure:** The system has a 5% random failure rate to test error handling.
    *   **Validation Error:** Enter an invalid card number to see client-side validation (Note: These are not stored in the DB).

### 4. Viewing Transactions
*   Go to the **Transactions** tab.
*   You'll see a real-time list of all payments (`success`, `failed`, `pending`).
*   **Refunds:** Click the "Refund" button on any successful transaction to process a partial or full refund.

### 5. Configured Webhooks
*   Go to **Webhooks**.
*   Enter your listener URL (e.g., `http://host.docker.internal:4000/webhook` for the included test app).
*   Trigger payments and watch the **Real-time Logs** table below to see `payment.created`, `payment.success`, etc., being delivered.

---

## 🛠️ Troubleshooting

Even the best systems have hiccups. Here's how to solve common issues:

### ❌ "Failed to load Payment SDK"
*   **Cause:** The dashboard cannot reach the Checkout Service.
*   **Fix:** Ensure the `checkout` container is running (`docker ps`). Open `http://localhost:3001/checkout.js` in your browser. If it loads, clear your browser cache and try again.

### ❌ "ERR_CONNECTION_REFUSED"
*   **Cause:** A service is not running or a port is blocked.
*   **Fix:** Check if Docker ports are mapped correctly. restart the stack:
    ```bash
    docker-compose down
    docker-compose up -d
    ```

### ❌ "Order Not Found"
*   **Cause:** You might be trying to pay for an order that belongs to a different merchant session.
*   **Fix:** Ensure you are logged in with the same email you used to create the order.

### ❌ Webhooks not being received
*   **Cause:** The Docker container cannot resolve `localhost`.
*   **Fix:** Use `http://host.docker.internal:4000/webhooks` instead of `localhost` when configuring the webhook URL in the dashboard.

---

## � API Reference

For developers who want to integrate directly:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/api/v1/orders` | Create a new order |
| **GET** | `/api/v1/orders/:id` | Fetch order details |
| **GET** | `/api/v1/payments` | List all payments |
| **POST** | `/api/v1/payments/:id/refunds` | Refund a payment |
| **GET** | `/api/v1/webhooks` | List webhook delivery logs |

*Authentication:* Pass `X-Api-Key` and `X-Api-Secret` headers in all requests.

---
