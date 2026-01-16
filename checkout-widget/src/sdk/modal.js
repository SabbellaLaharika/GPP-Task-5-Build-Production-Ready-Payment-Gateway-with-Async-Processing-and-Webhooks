import './styles.css';

export const createModal = (options) => {
    // Check if already open
    if (document.getElementById('payment-gateway-modal')) return;

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.id = 'payment-gateway-modal';
    overlay.className = 'pg-modal-overlay';
    overlay.setAttribute('data-test-id', 'payment-modal');

    // Container
    const container = document.createElement('div');
    container.className = 'pg-modal-content';

    // Determine Checkout URL (configurable or hardcoded for dev)
    // const CHECKOUT_URL = 'http://localhost:3001/checkout'; 
    // Per requirements screenshot: http://localhost:3001/checkout?order_id=...&embedded=true
    const CHECKOUT_BASE = 'http://localhost:3001/checkout'; // In real SDK this might be cdn driven
    const checkoutUrl = `${CHECKOUT_BASE}?order_id=${options.orderId}&embedded=true`;

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.src = checkoutUrl;
    iframe.className = 'pg-modal-iframe';
    iframe.setAttribute('data-test-id', 'payment-iframe');

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'pg-modal-close';
    closeBtn.setAttribute('data-test-id', 'close-modal-button');
    closeBtn.onclick = () => {
        // Notify parent to close via PaymentGateway instance (which calls close())
        // Or simpler: dispatch a custom event or let PaymentGateway handle it via direct call.
        // Since this is a helper, we can't easily call instance.close(). 
        // We'll dispatch a message to window that PaymentGateway listens to? 
        // Or just remove DOM manually and rely on user to clean up listeners (bad).
        // Better: Send a postMessage to SELF window that PaymentGateway handles.
        window.postMessage({ type: 'close_modal' }, '*');
    };

    container.appendChild(iframe);
    container.appendChild(closeBtn);
    overlay.appendChild(container);

    document.body.appendChild(overlay);
};

export const closeModal = () => {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.remove();
    }
};
