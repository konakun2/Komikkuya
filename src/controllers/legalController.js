const legalController = {
    terms: (req, res) => {
        res.render('legal/terms', {
            title: 'Terms of Usage - Komikkuya'
        });
    },

    privacy: (req, res) => {
        res.render('legal/privacy', {
            title: 'Privacy Policy - Komikkuya'
        });
    },

    dmca: (req, res) => {
        res.render('legal/dmca', {
            title: 'DMCA - Komikkuya'
        });
    },

    contact: (req, res) => {
        res.render('legal/contact', {
            title: 'Contact Us - Komikkuya'
        });
    },

    about: (req, res) => {
        res.render('legal/about', {
            title: 'Tentang Kami - Komikkuya',
            metaDescription: 'Tentang Komikkuya - Platform baca komik gratis manga, manhwa, manhua dalam Bahasa Indonesia. Baca komik online tanpa iklan!',
            metaKeywords: 'tentang komikkuya, about komikkuya, baca komik gratis, manga indonesia, manhwa indonesia, manhua indonesia',
            canonicalUrl: 'https://komikkuya.my.id/about',
            currentPath: '/about'
        });
    }
};

module.exports = legalController; 
