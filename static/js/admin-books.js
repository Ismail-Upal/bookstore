let categories = [];

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categories = await response.json();
        
        const categorySelect = document.getElementById('book-category');
        categorySelect.innerHTML = '<option value="">None</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function loadBooks() {
    try {
        const response = await fetch('/api/admin/books');
        
        if (response.status === 403) {
            window.location.href = '/';
            return;
        }
        
        const books = await response.json();
        const tbody = document.getElementById('books-table-body');
        
        if (!books || books.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-600">No books yet.</td></tr>';
            return;
        }
        
        tbody.innerHTML = books.map(book => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${book.cover_image_url || 'https://via.placeholder.com/50x75?text=No+Cover'}" 
                             alt="${book.title}" class="w-12 h-16 object-cover rounded">
                        <span class="font-medium">${book.title}</span>
                    </div>
                </td>
                <td class="px-6 py-4">${book.author}</td>
                <td class="px-6 py-4 font-semibold">${formatPrice(book.price)}</td>
                <td class="px-6 py-4">${book.stock_quantity}</td>
                <td class="px-6 py-4">${book.category_name || '-'}</td>
                <td class="px-6 py-4">
                    <button onclick="editBook(${book.id})" class="text-blue-600 hover:underline mr-3">Edit</button>
                    <button onclick="deleteBook(${book.id})" class="text-red-600 hover:underline">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load books:', error);
    }
}

document.getElementById('add-book-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add New Book';
    document.getElementById('book-form').reset();
    document.getElementById('book-id').value = '';
    document.getElementById('book-modal').classList.remove('hidden');
});

document.getElementById('cancel-btn').addEventListener('click', () => {
    document.getElementById('book-modal').classList.add('hidden');
});

document.getElementById('book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookId = document.getElementById('book-id').value;
    const bookData = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        description: document.getElementById('book-description').value,
        price: parseFloat(document.getElementById('book-price').value),
        stock_quantity: parseInt(document.getElementById('book-stock').value),
        category_id: parseInt(document.getElementById('book-category').value) || null,
        isbn: document.getElementById('book-isbn').value,
        publication_year: parseInt(document.getElementById('book-year').value) || null,
        cover_image_url: document.getElementById('book-cover').value || null
    };
    
    try {
        const url = bookId ? `/api/admin/books/${bookId}` : '/api/admin/books';
        const method = bookId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });
        
        if (response.ok) {
            showToast(bookId ? 'Book updated!' : 'Book added!');
            document.getElementById('book-modal').classList.add('hidden');
            loadBooks();
        } else {
            showToast('Failed to save book', 'error');
        }
    } catch (error) {
        showToast('Failed to save book', 'error');
    }
});

async function editBook(bookId) {
    try {
        const response = await fetch(`/api/books/${bookId}`);
        const book = await response.json();
        
        document.getElementById('modal-title').textContent = 'Edit Book';
        document.getElementById('book-id').value = book.id;
        document.getElementById('book-title').value = book.title;
        document.getElementById('book-author').value = book.author;
        document.getElementById('book-description').value = book.description || '';
        document.getElementById('book-price').value = book.price;
        document.getElementById('book-stock').value = book.stock_quantity;
        document.getElementById('book-category').value = book.category_id || '';
        document.getElementById('book-isbn').value = book.isbn || '';
        document.getElementById('book-year').value = book.publication_year || '';
        document.getElementById('book-cover').value = book.cover_image_url || '';
        
        document.getElementById('book-modal').classList.remove('hidden');
    } catch (error) {
        showToast('Failed to load book details', 'error');
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
        const response = await fetch(`/api/admin/books/${bookId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Book deleted!');
            loadBooks();
        } else {
            showToast('Failed to delete book', 'error');
        }
    } catch (error) {
        showToast('Failed to delete book', 'error');
    }
}

loadCategories();
loadBooks();
