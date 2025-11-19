document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        full_name: document.getElementById('full-name').value,
        phone: document.getElementById('phone').value,
        address_line1: document.getElementById('address-line1').value,
        address_line2: document.getElementById('address-line2').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        postal_code: document.getElementById('postal-code').value,
        country: document.getElementById('country').value
    };
    
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const data = await response.json();
            
            document.getElementById('checkout-form-container').classList.add('hidden');
            document.getElementById('checkout-complete').classList.remove('hidden');
            document.getElementById('order-number').textContent = data.order_number;
            
            updateCartCount();
        } else {
            const error = await response.text();
            errorDiv.textContent = error || 'Checkout failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    }
});
