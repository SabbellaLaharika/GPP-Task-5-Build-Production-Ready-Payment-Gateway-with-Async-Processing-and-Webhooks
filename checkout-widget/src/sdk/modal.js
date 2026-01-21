import './styles.css';

export const createModal = (options) => {
    if (document.getElementById('payment-gateway-modal')) return;

    // Create Modal Container (Root)
    const modalRoot = document.createElement('div');
    modalRoot.id = 'payment-gateway-modal';
    modalRoot.setAttribute('data-test-id', 'payment-modal');

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    modalRoot.appendChild(overlay);

    // Content Container
    const content = document.createElement('div');
    content.className = 'modal-content';

    // Iframe
    const CHECKOUT_BASE = 'http://localhost:3001/checkout';
    const checkoutUrl = `${CHECKOUT_BASE}?order_id=${options.orderId}&embedded=true`;

    const iframe = document.createElement('iframe');
    iframe.src = checkoutUrl;
    iframe.setAttribute('data-test-id', 'payment-iframe');
    content.appendChild(iframe);

    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'close-button';
    closeBtn.setAttribute('data-test-id', 'close-modal-button');
    closeBtn.onclick = () => window.postMessage({ type: 'close_modal' }, '*');
    content.appendChild(closeBtn);

    // Assembly
    // Requirement shows: <div id="payment-gateway-modal"> <div class="modal-overlay"> <div class="modal-content"> ...
    // BUT wait, standard modal usually has overlay as sibling or parent.
    // The snippet shows:
    // <div id="payment-gateway-modal" ...>
    //   <div class="modal-overlay"> 
    //      <div class="modal-content"> ...
    //   </div>
    // </div>
    // Let's match strictly:

    // Actually, looking at snippet:
    // <div id="payment-gateway-modal">
    //   <div class="modal-overlay">
    //     <div class="modal-content"> ... </div>
    //   </div>
    // </div>
    // My previous read was slightly off, it seems overlay WRAPS content in the snippet?
    // "div class=modal-overlay > div class=modal-content"

    overlay.appendChild(content);
    // Modal Root appends Overlay
    // modalRoot already conforms? No, modalRoot IS the data-test-id="payment-modal".
    // Wait, snippet says:
    // <div id="payment-gateway-modal" data-test-id="payment-modal">
    //   <div class="modal-overlay">...</div>
    // </div>

    document.body.appendChild(modalRoot);
};

export const closeModal = () => {
    const modal = document.getElementById('payment-gateway-modal');
    if (modal) {
        modal.remove();
    }
};
