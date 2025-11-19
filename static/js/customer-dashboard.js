async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const orders = await response.json();
        
        let totalOrders = 0;
        let pendingOrders = 0;
        let completedOrders = 0;
        
        orders.forEach(order => {
            totalOrders++;
            if (order.status === 'pending' || order.status === 'processing') {
                pendingOrders++;
            } else if (order.status === 'delivered') {
                completedOrders++;
            }
        });
        
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('pending-orders').textContent = pendingOrders;
        document.getElementById('completed-orders').textContent = completedOrders;
        
        const container = document.getElementById('orders-container');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                    <a href="/books" class="text-blue-600 hover:underline">Start Shopping</a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Number</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${orders.map(order => `
                            <tr>
                                <td class="px-6 py-4 font-medium">${order.order_number}</td>
                                <td class="px-6 py-4 text-gray-600">${formatDate(order.created_at)}</td>
                                <td class="px-6 py-4 font-semibold">${formatPrice(order.total_amount)}</td>
                                <td class="px-6 py-4">
                                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}">
                                        ${order.status.toUpperCase()}
                                    </span>
                                </td>
                                <td class="px-6 py-4">
                                    <button onclick="viewOrder(${order.id})" class="text-blue-600 hover:underline">
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

async function viewOrder(orderId) {
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
                    
                    <button onclick="this.closest('.fixed').remove()" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
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
