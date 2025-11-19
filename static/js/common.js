async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const user = await response.json();
            const guestMenu = document.getElementById('guest-menu');
            const userMenu = document.getElementById('user-menu');
            const adminMenu = document.getElementById('admin-menu');
            
            if (guestMenu) guestMenu.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            
            if (user.is_admin && adminMenu) {
                adminMenu.classList.remove('hidden');
            }
            
            setupLogoutButton();
            return user;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
    return null;
}

function setupLogoutButton() {
    const logoutBtns = document.querySelectorAll('#logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast px-6 py-4 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatPrice(price) {
    return '$' + parseFloat(price).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'processing': 'bg-blue-100 text-blue-800',
        'shipped': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

async function updateCartCount() {
    try {
        const response = await fetch('/api/cart');
        if (response.ok) {
            const items = await response.json();
            const cartCount = document.getElementById('cart-count');
            if (cartCount && items && items.length > 0) {
                const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
                cartCount.textContent = totalItems;
                cartCount.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to update cart count:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        checkAuth();
        updateCartCount();
    });
} else {
    checkAuth();
    updateCartCount();
}
