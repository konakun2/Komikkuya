/**
 * Favorite Controller
 * Handles the favorites page functionality
 */

const getFavorites = async (req, res) => {
    try {
        // Favorites are managed client-side via localStorage. 
        // We render the view with an empty array or initial state, and JavaScript handles the rest.
        res.render('favorite/index', {
            title: 'My Favorites - Komikkuya',
            favorites: [],
            layout: 'layouts/main' // Use main layout by default
        });
    } catch (error) {
        console.error('Error rendering favorites:', error);
        res.status(500).render('error', {
            title: 'Error - Komikkuya',
            error: {
                status: 500,
                message: 'An error occurred while loading your favorites.'
            }
        });
    }
};

module.exports = {
    getFavorites
};
