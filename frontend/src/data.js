
import spidermanImg from './assets/spiderman_no_way_home.jpg';
import witcherImg from './assets/the_witcher.jpg';
import batmanImg from './assets/the batman.jpg';

export const MOVIES = [
    {
        id: 3,
        title: "The Batman",
        image: batmanImg,
        backdrop: batmanImg,
        video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        rating: 7.7,
        year: 2022,
        genre: "Crime",
        description: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler."
    },
    {
        id: 1,
        title: "Top Gun: Maverick",
        image: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg",
        video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
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
        video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        rating: 8.0,
        year: 2021,
        genre: "Action",
        description: "Peter Parker is unmasked and no longer able to separate his normal life from the high-stakes of being a super-hero. When he asks for help from Doctor Strange the stakes become even more dangerous."
    },
    {
        id: 4,
        title: "Avatar: The Way of Water",
        image: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg",
        video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        rating: 7.6,
        year: 2022,
        genre: "Sci-Fi",
        description: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home."
    },
    {
        id: 5,
        title: "Black Adam",
        image: "https://image.tmdb.org/t/p/w500/pFlaoHTZeyNkG83vxsAJiGzfSsa.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/bQXAqRx2Fgc46uCVWgoPz5L5Dtr.jpg",
        video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
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
        image: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYkJu64COcfe.jpg",
        progress: 70,
        episode: "S4:E1",
        type: 'series',
        description: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.",
        year: 2016,
        rating: 8.7,
        genre: "Sci-Fi",
        seasons: [
            {
                id: 1,
                name: "Season 1",
                episodes: [
                    { id: 1011, title: "Chapter One: The Vanishing of Will Byers", duration: "49m", image: "https://image.tmdb.org/t/p/w300/Ad217c2a74ed0aD1P0gG6z9X8C8.jpg" },
                    { id: 1012, title: "Chapter Two: The Weirdo on Maple Street", duration: "56m", image: "https://image.tmdb.org/t/p/w300/z6hW39k5b42y9K47a12b.jpg" },
                    { id: 1013, title: "Chapter Three: Holly, Jolly", duration: "52m", image: "https://image.tmdb.org/t/p/w300/r55fJ3177d13.jpg" },
                ]
            },
            {
                id: 4,
                name: "Season 4",
                episodes: [
                    { id: 1041, title: "Chapter One: The Hellfire Club", duration: "1h 18m", image: "https://image.tmdb.org/t/p/w300/wzKx7D4C82b82.jpg" },
                    { id: 1042, title: "Chapter Two: Vecna's Curse", duration: "1h 17m", image: "https://image.tmdb.org/t/p/w300/a5217.jpg" },
                ]
            }
        ]
    },
    {
        id: 102,
        title: "Wednesday",
        image: "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
        backdrop: "https://image.tmdb.org/t/p/original/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg",
        progress: 30,
        episode: "S1:E3",
        type: 'series',
        description: "Wednesday Addams is sent to Nevermore Academy, a bizarre boarding school where she attempts to master her psychic powers, stop a monstrous killing spree, and solve a mystery.",
        year: 2022,
        rating: 8.5,
        genre: "Fantasy",
        seasons: [
            {
                id: 1,
                name: "Season 1",
                episodes: [
                    { id: 2011, title: "Wednesday's Child is Full of Woe", duration: "59m", image: "https://image.tmdb.org/t/p/w300/a231.jpg" },
                    { id: 2012, title: "Woe is the Loneliest Number", duration: "48m", image: "https://image.tmdb.org/t/p/w300/b412.jpg" },
                    { id: 2013, title: "Friend or Woe", duration: "53m", image: "https://image.tmdb.org/t/p/w300/c512.jpg" },
                ]
            }
        ]
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
        MOVIES[0],
        MOVIES[2],
        MOVIES[4]
    ],
    downloads: [
        {
            ...MOVIES[1],
            size: "1.2 GB"
        },
        {
            ...MOVIES[3],
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
