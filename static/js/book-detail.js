const bookId = window.location.pathname.split('/').pop();

async function loadBookDetail() {
    try {
        const response = await fetch(`/api/books/${bookId}`);
        
        if (!response.ok) {
            throw new Error('Book not found');
        }
        
        const book = await response.json();
        
        document.getElementById('book-detail').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <img src="${book.cover_image_url || 'https://via.placeholder.com/400x600?text=No+Cover'}" 
                        alt="${book.title}" 
                        onerror="this.onerror=null;this.src='https://via.placeholder.com/400x600?text=No+Cover'"
                        class="w-full rounded-lg shadow-lg">
                </div>
                
                <div>
                    <h1 class="text-4xl font-bold mb-4">${book.title}</h1>
                    <p class="text-xl text-gray-600 mb-4">by ${book.author}</p>
                    
                    ${book.category_name ? `<span class="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full mb-4">${book.category_name}</span>` : ''}
                    
                    <div class="mb-6">
                        <p class="text-3xl font-bold text-blue-600">${formatPrice(book.price)}</p>
                        <p class="text-sm ${book.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'} mt-2">
                            ${book.stock_quantity > 0 ? `${book.stock_quantity} in stock` : 'Out of stock'}
                        </p>
                    </div>
                    
                    ${book.description ? `
                        <div class="mb-6">
                            <h3 class="font-bold text-lg mb-2">Description</h3>
                            <p class="text-gray-700">${book.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="mb-6">
                        ${book.isbn ? `<p class="text-sm text-gray-600 mb-1"><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                        ${book.publication_year ? `<p class="text-sm text-gray-600"><strong>Published:</strong> ${book.publication_year}</p>` : ''}
                    </div>
                    
                    ${book.stock_quantity > 0 ? `
                        <button id="add-to-cart-btn" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg">
                            Add to Cart
                        </button>
                    ` : `
                        <button disabled class="w-full bg-gray-300 text-gray-600 py-3 rounded-lg font-semibold text-lg cursor-not-allowed">
                            Out of Stock
                        </button>
                    `}
                </div>
            </div>
        `;
        
        if (book.stock_quantity > 0) {
            document.getElementById('add-to-cart-btn').addEventListener('click', async () => {
                try {
                    const response = await fetch('/api/cart/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ book_id: book.id, quantity: 1 })
                    });
                    
                    if (response.ok) {
                        showToast('Added to cart!');
                        updateCartCount();
                    } else if (response.status === 401) {
                        window.location.href = '/login';
                    } else {
                        showToast('Failed to add to cart', 'error');
                    }
                } catch (error) {
                    showToast('Failed to add to cart', 'error');
                }
            });
        }
    } catch (error) {
        console.error('Failed to load book:', error);
        document.getElementById('book-detail').innerHTML = `
            <div class="text-center py-8">
                <p class="text-xl text-red-600">Book not found</p>
                <a href="/books" class="text-blue-600 hover:underline mt-4 inline-block">Back to Books</a>
            </div>
        `;
    }
}

loadBookDetail();
