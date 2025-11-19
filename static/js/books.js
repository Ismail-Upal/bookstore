let categories = [];
let currentFilters = {
    search: '',
    category: '',
    sort: ''
};

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        
        const categoryFilter = document.getElementById('category-filter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function loadBooks() {
    const container = document.getElementById('books-container');
    container.innerHTML = '<div class="col-span-full text-center py-8"><div class="spinner mx-auto"></div><p class="mt-4 text-gray-600">Loading books...</p></div>';
    
    try {
        const params = new URLSearchParams();
        if (currentFilters.search) params.append('search', currentFilters.search);
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.sort) params.append('sort', currentFilters.sort);
        
        const response = await fetch(`/api/books?${params}`);
        const books = await response.json();
        
        if (!books || books.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-600 py-8">No books found.</p>';
            return;
        }
        
        container.innerHTML = books.map(book => `
            <div class="book-card bg-white rounded-lg shadow-md overflow-hidden">
                 <img src="${book.cover_image_url || 'https://via.placeholder.com/300x400?text=No+Cover'}" 
                     alt="${book.title}" 
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/300x400?text=No+Cover'"
                     class="w-full h-64 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2 line-clamp-2">${book.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${book.author}</p>
                    ${book.category_name ? `<span class="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded mb-2">${book.category_name}</span>` : ''}
                    <p class="text-gray-500 text-sm mb-2">${book.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-blue-600 font-bold text-xl">${formatPrice(book.price)}</span>
                        <a href="/book/${book.id}" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            View
                        </a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load books:', error);
        container.innerHTML = '<p class="col-span-full text-center text-red-600">Failed to load books</p>';
    }
}

document.getElementById('search-input').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    loadBooks();
});

document.getElementById('category-filter').addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    loadBooks();
});

document.getElementById('sort-filter').addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    loadBooks();
});

document.getElementById('clear-filters').addEventListener('click', () => {
    currentFilters = { search: '', category: '', sort: '' };
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('sort-filter').value = '';
    loadBooks();
});

loadCategories();
loadBooks();
