async function loadCart() {
    try {
        const response = await fetch('/api/cart');
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const items = await response.json();
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCart = document.getElementById('empty-cart');
        const cartSummary = document.getElementById('cart-summary');
        
        if (!items || items.length === 0) {
            cartItemsContainer.classList.add('hidden');
            cartSummary.classList.add('hidden');
            emptyCart.classList.remove('hidden');
            return;
        }
        
        emptyCart.classList.add('hidden');
        cartItemsContainer.classList.remove('hidden');
        cartSummary.classList.remove('hidden');
        
        let total = 0;
        
        cartItemsContainer.innerHTML = items.map(item => {
            const subtotal = item.book.price * item.quantity;
            total += subtotal;
            
            return `
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex gap-4">
                        <img src="${item.book.cover_image_url || 'https://via.placeholder.com/100x150?text=No+Cover'}" 
                             alt="${item.book.title}" 
                             class="w-24 h-32 object-cover rounded">
                        
                        <div class="flex-1">
                            <h3 class="font-bold text-lg mb-1">${item.book.title}</h3>
                            <p class="text-gray-600 text-sm mb-2">${item.book.author}</p>
                            <p class="text-blue-600 font-semibold">${formatPrice(item.book.price)}</p>
                            
                            <div class="flex items-center gap-4 mt-4">
                                <div class="flex items-center gap-2">
                                    <button onclick="updateQuantity(${item.book_id}, ${item.quantity - 1})" 
                                            class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                                            ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                                    <span class="px-4">${item.quantity}</span>
                                    <button onclick="updateQuantity(${item.book_id}, ${item.quantity + 1})" 
                                            class="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                                            ${item.quantity >= item.book.stock_quantity ? 'disabled' : ''}>+</button>
                                </div>
                                
                                <button onclick="removeItem(${item.book_id})" 
                                        class="text-red-600 hover:text-red-700 ml-auto">
                                    Remove
                                </button>
                            </div>
                        </div>
                        
                        <div class="text-right">
                            <p class="font-bold text-lg">${formatPrice(subtotal)}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        document.getElementById('subtotal').textContent = formatPrice(total);
        document.getElementById('total').textContent = formatPrice(total);
        
    } catch (error) {
        console.error('Failed to load cart:', error);
    }
}

async function updateQuantity(bookId, newQuantity) {
    if (newQuantity < 1) return;
    
    try {
        const response = await fetch('/api/cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId, quantity: newQuantity })
        });
        
        if (response.ok) {
            loadCart();
            updateCartCount();
        }
    } catch (error) {
        console.error('Failed to update quantity:', error);
    }
}

async function removeItem(bookId) {
    if (!confirm('Remove this item from cart?')) return;
    
    try {
        const response = await fetch('/api/cart/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId })
        });
        
        if (response.ok) {
            showToast('Item removed from cart');
            loadCart();
            updateCartCount();
        }
    } catch (error) {
        console.error('Failed to remove item:', error);
    }
}

loadCart();
