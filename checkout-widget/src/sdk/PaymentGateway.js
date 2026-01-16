import { createModal, closeModal } from './modal.js';

class PaymentGateway {
    constructor(options) {
        this.options = options || {};
        this.validateOptions();

        // Bind methods to instance
        this.handleMessage = this.handleMessage.bind(this);
    }

    validateOptions() {
        if (!this.options.key) {
            console.error('PaymentGateway: API Key is required');
        }
        if (!this.options.orderId) {
            console.error('PaymentGateway: Order ID is required');
        }
    }

    open() {
        // 1. Create modal overlay and iframe
        createModal(this.options);

        // 2. Listen for messages from the iframe
        window.addEventListener('message', this.handleMessage);
    }

    close() {
        closeModal();
        window.removeEventListener('message', this.handleMessage);

        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    handleMessage(event) {
        // Basic security check - verify origin if possible
        // For local dev, we might allow localhost:3001
        // if (event.origin !== 'http://localhost:3001') return;

        if (!event.data) return;

        const { type, data } = event.data;

        if (type === 'payment_success') {
            if (this.options.onSuccess) {
                this.options.onSuccess(data);
            }
            // Optional: Auto close on success? 
            // Requirement says "Show modal", doesn't explicitly say close. 
            // But usually we close or let user close.
        } else if (type === 'payment_failed') {
            if (this.options.onFailure) {
                this.options.onFailure(data);
            }
        } else if (type === 'close_modal') {
            this.close();
        }
    }
}

// Expose globally
// window.PaymentGateway = PaymentGateway; // logic handled by webpack library output
export default PaymentGateway;
