async function loadOrders() {
    try {
        const response = await fetch('/api/admin/orders');
        
        if (response.status === 403) {
            window.location.href = '/';
            return;
        }
        
        const orders = await response.json();
        const tbody = document.getElementById('orders-table-body');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-600">No orders yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 font-medium">${order.order_number}</td>
                <td class="px-6 py-4">
                    <div>
                        <p class="font-medium">${order.customer_name}</p>
                        <p class="text-sm text-gray-600">${order.customer_email}</p>
                    </div>
                </td>
                <td class="px-6 py-4 font-semibold">${formatPrice(order.total_amount)}</td>
                <td class="px-6 py-4">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" 
                            class="px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(order.status)}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>PENDING</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>PROCESSING</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>SHIPPED</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>DELIVERED</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>CANCELLED</option>
                    </select>
                </td>
                <td class="px-6 py-4 text-gray-600">${formatDate(order.created_at)}</td>
                <td class="px-6 py-4">
                    <button onclick="viewOrderDetails(${order.id})" class="text-blue-600 hover:underline">
                        View Details
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showToast('Order status updated!');
        } else {
            showToast('Failed to update status', 'error');
            loadOrders();
        }
    } catch (error) {
        showToast('Failed to update status', 'error');
        loadOrders();
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const order = await response.json();
        
        const detailsHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div class="bg-white rounded-lg max-w-3xl w-full max-h-screen overflow-y-auto p-8">
                    <h2 class="text-2xl font-bold mb-4">Order Details</h2>
                    
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <p class="text-sm text-gray-600">Order Number</p>
                            <p class="font-semibold">${order.order_number}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Order Date</p>
                            <p class="font-semibold">${formatDate(order.created_at)}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Status</p>
                            <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}">
                                ${order.status.toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Total Amount</p>
                            <p class="font-bold text-xl">${formatPrice(order.total_amount)}</p>
                        </div>
                    </div>
                    
                    <div class="mb-6">
                        <h3 class="font-bold mb-2">Shipping Address</h3>
                        <p>${order.shipping_address.full_name}</p>
                        <p>${order.shipping_address.phone}</p>
                        <p>${order.shipping_address.address_line1}</p>
                        ${order.shipping_address.address_line2 ? `<p>${order.shipping_address.address_line2}</p>` : ''}
                        <p>${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}</p>
                        <p>${order.shipping_address.country}</p>
                    </div>
                    
                    <div class="mb-6">
                        <h3 class="font-bold mb-2">Order Items</h3>
                        <div class="space-y-2">
                            ${order.items.map(item => `
                                <div class="flex justify-between border-b pb-2">
                                    <div>
                                        <p class="font-semibold">${item.book_title}</p>
                                        <p class="text-sm text-gray-600">${item.book_author}</p>
                                        <p class="text-sm">Quantity: ${item.quantity} × ${formatPrice(item.price_at_purchase)}</p>
                                    </div>
                                    <p class="font-semibold">${formatPrice(item.subtotal)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <button onclick="this.closest('.fixed').remove()" class="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', detailsHtml);
    } catch (error) {
        console.error('Failed to load order details:', error);
    }
}

loadOrders();
