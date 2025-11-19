async function loadFeaturedBooks() {
    try {
        const response = await fetch('/api/books?sort=&limit=8');
        const books = await response.json();
        
        const container = document.getElementById('featured-books');
        
        if (!books || books.length === 0) {
            container.innerHTML = '<p class="col-span-full text-center text-gray-600">No books available yet.</p>';
            return;
        }
        
        container.innerHTML = books.slice(0, 8).map(book => `
            <div class="book-card bg-white rounded-lg shadow-md overflow-hidden">
                 <img src="${book.cover_image_url || 'https://via.placeholder.com/300x400?text=No+Cover'}" 
                     alt="${book.title}" 
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/300x400?text=No+Cover'"
                     class="w-full h-64 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg mb-2 truncate">${book.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${book.author}</p>
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
        document.getElementById('featured-books').innerHTML = 
            '<p class="col-span-full text-center text-red-600">Failed to load books</p>';
    }
}

loadFeaturedBooks();
