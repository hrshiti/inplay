const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Content = require('../models/Content');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedData = [
  { title: 'The Silent Sea', genre: 'Sci-Fi', type: 'movie', rating: 8.5 },
  { title: 'Mirzapur Season 3', genre: 'Action', type: 'hindi_series', rating: 9.0 },
  { title: 'Dark Matter', genre: 'Thriller', type: 'series', rating: 8.2 },
  { title: 'Panchayat', genre: 'Comedy', type: 'hindi_series', rating: 9.5 },
  { title: 'Interstellar', genre: 'Adventure', type: 'movie', rating: 9.8 },
  { title: 'Heeramandi', genre: 'Drama', type: 'hindi_series', rating: 7.9 },
  { title: 'Stranger Things', genre: 'Horror', type: 'series', rating: 8.9 },
  { title: 'The Godfather', genre: 'Crime', type: 'movie', rating: 9.2 },
  { title: 'Farzi', genre: 'Thriller', type: 'hindi_series', rating: 8.7 },
  { title: 'Inception', genre: 'Sci-Fi', type: 'movie', rating: 8.8 }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding');

        const items = seedData.map(data => ({
            ...data,
            description: `This is a professionally curated ${data.type} titled ${data.title}. High quality streaming available.`,
            status: 'published',
            year: 2024,
            video: {
                url: '/uploads/videos/dummy.mp4',
                public_id: 'dummy_video'
            },
            poster: {
                url: '/uploads/images/posters/dummy.jpg',
                public_id: 'dummy_poster'
            },
            backdrop: {
                url: '/uploads/images/backdrops/dummy.jpg',
                public_id: 'dummy_backdrop'
            }
        }));

        await Content.insertMany(items);
        console.log('✅ Successfully added 10 items to the library!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
