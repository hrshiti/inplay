import batmanImg from './assets/the batman.jpg';
import spidermanImg from './assets/spiderman_no_way_home.jpg';
import witcherImg from './assets/the_witcher.jpg';
// Reusing some from newData assets if needed or just these unique ones
// Since I can't import from newData.js easily due to circular deps if I'm not careful (though distinct files are fine), 
// I'll just rely on these specific ones for the main slider data.
// Wait, Top Gun and others don't have images in assets?
// I missed `top gun` in the list. 
// List: apna banale, border, drishyam, familyman, farzi, inplay logo, kesariya, lolipop, mirzapur, nirauya, pathaan, rinkiya, sacredgames, shershaa, spiderman, the batman, the witcher, tum hi ho.
// No Top Gun, No Avatar, No Black Adam.
// I will reuse available images for them to ensure no blanks.
const topGunImg = batmanImg;
const avatarImg = spidermanImg;
const blackAdamImg = batmanImg;

export const MOVIES = [
    {
        id: 3,
        title: "The Batman",
        image: batmanImg,
        backdrop: batmanImg,
        video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        rating: 7.7,
        year: 2022,
        genre: "Crime",
        description: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
        isPaid: true,
        price: 199
    },
    {
        id: 1,
        title: "Top Gun: Maverick",
        image: topGunImg,
        backdrop: topGunImg,
        video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        rating: 8.4,
        year: 2022,
        genre: "Action",
        description: "After more than thirty years of service as one of the Navy's top aviators, Pete 'Maverick' Mitchell finds himself training a detachment of TOP GUN graduates for a specialized mission."
    },
    {
        id: 2,
        title: "Spider-Man: No Way Home",
        image: spidermanImg,
        backdrop: spidermanImg,
        video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        rating: 8.0,
        year: 2021,
        genre: "Action",
        description: "Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero. When he asks for help from Doctor Strange the stakes become even more dangerous."
    },
    {
        id: 4,
        title: "Avatar: The Way of Water",
        image: avatarImg,
        backdrop: avatarImg,
        video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        rating: 7.6,
        year: 2022,
        genre: "Sci-Fi",
        description: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home.",
        isPaid: true,
        price: 249
    },
    {
        id: 5,
        title: "Black Adam",
        image: blackAdamImg,
        backdrop: blackAdamImg,
        video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        rating: 7.0,
        year: 2022,
        genre: "Action",
        description: "Nearly 5,000 years after he was bestowed with the almighty powers of the Egyptian gods—and imprisoned just as quickly—Black Adam is freed from his earthly tomb, ready to unleash his unique form of justice on the modern world."
    }
];

export const CONTINUE_WATCHING = [
    {
        id: 101,
        title: "Stranger Things",
        image: witcherImg, // Reusing witcher as dark fantasy vibe
        backdrop: witcherImg,
        progress: 70,
        episode: "S4:E1",
        type: 'series',
        description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
        year: 2016,
        rating: 8.7,
        genre: "Sci-Fi",
        seasons: []
    },
    {
        id: 102,
        title: "Wednesday",
        image: batmanImg, // Reusing batman for dark vibe
        backdrop: batmanImg,
        progress: 30,
        episode: "S1:E3",
        type: 'series',
        description: "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her psychic powers, stop a monstrous killing spree, and solve a mystery.",
        year: 2022,
        rating: 8.5,
        genre: "Fantasy",
        seasons: []
    },
    {
        id: 103,
        title: "The Witcher",
        image: witcherImg,
        backdrop: witcherImg,
        progress: 90,
        episode: "S2:E8",
        type: 'series',
        year: 2019,
        rating: 8.1,
        genre: "Fantasy",
        description: "Geralt of Rivia, a mutated monster-hunter for hire, journeys toward his destiny in a turbulent world where people often prove more wicked than beasts."
    },
    {
        id: 104,
        title: "Squid Game",
        image: spidermanImg, // Placeholder reuse
        backdrop: spidermanImg,
        progress: 15,
        episode: "S1:E2",
        type: 'series',
        year: 2021,
        rating: 8.4,
        genre: "Thriller",
        description: "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes."
    }
];

export const CATEGORIES = [
    "All",
    "Movies",
    "Drama",
    "Thriller",
    "Romance",
    "Comedy",
    "Sci-Fi"
];

export const SUBSCRIPTION_PLANS = [
    {
        id: 'mobile',
        name: 'Mobile',
        price: '₹149',
        quality: 'Good',
        resolution: '480p',
        devices: ['Mobile', 'Tablet'],
        color: '#3b82f6',
        features: ['Ad-free movies', 'Unlimited content']
    },
    {
        id: 'basic',
        name: 'Basic',
        price: '₹199',
        quality: 'Better',
        resolution: '720p',
        devices: ['Mobile', 'Tablet', 'Computer', 'TV'],
        color: '#a855f7',
        features: ['Ad-free movies', 'Unlimited content', 'Watch on TV']
    },
    {
        id: 'standard',
        name: 'Standard',
        price: '₹499',
        quality: 'Best',
        resolution: '1080p',
        devices: ['Mobile', 'Tablet', 'Computer', 'TV'],
        color: '#eab308',
        features: ['Ad-free movies', 'Unlimited content', 'Watch on 2 devices']
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₹649',
        quality: 'Ultra',
        resolution: '4K+HDR',
        devices: ['Mobile', 'Tablet', 'Computer', 'TV'],
        color: '#ef4444',
        features: ['Ad-free movies', 'Unlimited content', 'Watch on 4 devices', 'Spatial Audio']
    }
];

export const MY_SPACE_DATA = {
    user: {
        name: "John Doe",
        avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
        plan: "Premium"
    },
    watch_later: [
        MOVIES[0], // Batman
        MOVIES[2], // Spiderman
        MOVIES[4]  // Black Adam (Batman reuse)
    ],
    downloads: [
        {
            ...MOVIES[1], // Top Gun (Batman reuse)
            size: "1.2 GB"
        },
        {
            ...MOVIES[3], // Avatar (Spiderman reuse)
            size: "2.4 GB"
        }
    ],
    history: [
        {
            ...CONTINUE_WATCHING[0],
            watched_date: "Yesterday"
        },
        {
            ...CONTINUE_WATCHING[1],
            watched_date: "2 days ago"
        }
    ]
};
