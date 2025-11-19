async function loadDashboardData() {
    try {
        const [booksResponse, ordersResponse] = await Promise.all([
            fetch('/api/admin/books'),
            fetch('/api/admin/orders')
        ]);
        
        if (booksResponse.status === 403 || ordersResponse.status === 403) {
            window.location.href = '/';
            return;
        }
        
        const books = await booksResponse.json();
        const orders = await ordersResponse.json();
        
        let totalRevenue = 0;
        let pendingOrders = 0;
        
        orders.forEach(order => {
            totalRevenue += order.total_amount;
            if (order.status === 'pending' || order.status === 'processing') {
                pendingOrders++;
            }
        });
        
        document.getElementById('total-books').textContent = books.length;
        document.getElementById('total-orders').textContent = orders.length;
        document.getElementById('pending-orders').textContent = pendingOrders;
        document.getElementById('total-revenue').textContent = formatPrice(totalRevenue);
        
        const container = document.getElementById('recent-orders');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-600 py-8">No orders yet.</p>';
            return;
        }
        
        const recentOrders = orders.slice(0, 10);
        
        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${recentOrders.map(order => `
                            <tr>
                                <td class="px-6 py-4 font-medium">${order.order_number}</td>
                                <td class="px-6 py-4">
                                    <div>
                                        <p class="font-medium">${order.customer_name}</p>
                                        <p class="text-sm text-gray-600">${order.customer_email}</p>
                                    </div>
                                </td>
                                <td class="px-6 py-4 font-semibold">${formatPrice(order.total_amount)}</td>
                                <td class="px-6 py-4">
                                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}">
                                        ${order.status.toUpperCase()}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-gray-600">${formatDate(order.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

loadDashboardData();
