import mirzapur from './assets/mirzapur.jpeg';
import familyMan from './assets/familyman.jpg';
import sacredGames from './assets/sacredgames.jpg';
import farzi from './assets/farzi.jpeg';
import border from './assets/border.jpeg';
import nirahua from './assets/nirauya hindustani.jpeg';
import lollipop from './assets/lolipop lagelu.jpeg';
import apnaBanale from './assets/apna banale.jpeg';
import kesariya from './assets/kesariya.jpeg';
import rinkiya from './assets/rinkiya ke papa.jpeg';
import tumHiHo from './assets/tum hi ho.jpeg';
import shershaah from './assets/shershaa.jpeg';
import pathaan from './assets/pathaan.jpeg';
import drishyam from './assets/drishyam.jpeg';
// Reusing images for others to ensure no blanks
const asurImg = mirzapur;
const pratigyaImg = border;
const sangharshImg = nirahua;
const sherSinghImg = border;
const kantaraImg = pathaan;
const rrrImg = pathaan;
const pushpaImg = drishyam;
const jawanImg = pathaan;
const warImg = pathaan;
const baaghiImg = farzi;
const kgfImg = drishyam;

// Mock data for new categories

export const HINDI_SERIES = [
    {
        id: 'h1',
        title: "Mirzapur",
        image: mirzapur,
        rating: 8.5,
        year: 2018,
        genre: "Crime",
        description: "A shocking incident at a wedding procession ignites a series of events entangling the lives of two families in the lawless city of Mirzapur.",
        isPaid: true,
        price: 299,
        type: 'series',
        episodes: [
            { id: 1, title: "Part 1: The Beginning", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", duration: "12:00" },
            { id: 2, title: "Part 2: The Conflict", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", duration: "15:30" },
            { id: 3, title: "Part 3: The Revenge", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", duration: "14:15" },
        ]
    },
    {
        id: 'h2',
        title: "The Family Man",
        image: familyMan,
        rating: 8.8,
        year: 2019,
        genre: "Action",
        description: "A working man from the National Investigation Agency tries to protect the nation from terrorism.",
        type: 'series',
        episodes: [
            { id: 1, title: "Part 1", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4", duration: "10:00" },
            { id: 2, title: "Part 2", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4", duration: "12:00" },
        ]
    },
    {
        id: 'h3',
        title: "Sacred Games",
        image: sacredGames,
        rating: 8.6,
        year: 2018,
        genre: "Thriller",
        description: "A link in their pasts leads an honest cop to a fugitive gang boss.",
        isPaid: true,
        price: 199,
        type: 'series',
        episodes: [
            { id: 1, title: "Part 1", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", duration: "20:00" }
        ]
    },
    {
        id: 'h4',
        title: "Asur",
        image: asurImg,
        rating: 8.5,
        year: 2020,
        genre: "Thriller",
        description: "A forensic expert returns to his roots at the CBI.",
        type: 'series',
        episodes: [
            { id: 1, title: "Part 1", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4", duration: "20:00" }
        ]
    },
    {
        id: 'h5',
        title: "Farzi",
        image: farzi,
        rating: 8.9,
        year: 2023,
        genre: "Crime",
        description: "A small-time artist designs the ultimate con job.",
        type: 'series',
        episodes: [
            { id: 1, title: "Part 1", video: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", duration: "20:00" }
        ]
    }
];

export const BHOJPURI_CONTENT = [
    {
        id: 'b1',
        title: "Pratigya 2",
        image: pratigyaImg,
        rating: 7.2,
        year: 2014,
        genre: "Action",
        description: "A brave man fights against corruption and injustice in his village."
    },
    {
        id: 'b2',
        title: "Nirahua Hindustani",
        image: nirahua,
        rating: 7.5,
        year: 2014,
        genre: "Romance",
        description: "Nirahua, a simple villager, comes to Mumbai in search of his dream girl.",
        isPaid: true,
        price: 99
    },
    {
        id: 'b3',
        title: "Border",
        image: border,
        rating: 8.0,
        year: 2018,
        genre: "War",
        description: "The story of prolonged war between India and Pakistan.",
        isPaid: true,
        price: 49
    },
    {
        id: 'b4',
        title: "Sangharsh",
        image: sangharshImg,
        rating: 7.8,
        year: 2018,
        genre: "Drama",
        description: "A powerful story about the struggles of a common man."
    },
    {
        id: 'b5',
        title: "Sher Singh",
        image: sherSinghImg,
        rating: 6.9,
        year: 2019,
        genre: "Action",
        description: "A classic Bhojpuri movie about family dynamics and wealth."
    }
];

export const SONGS = [
    {
        id: 's1',
        title: "Lollipop Lagelu",
        artist: "Pawan Singh",
        image: lollipop,
        year: 2015
    },
    {
        id: 's2',
        title: "Apna Bana Le",
        artist: "Arijit Singh",
        image: apnaBanale,
        year: 2022
    },
    {
        id: 's3',
        title: "Kesariya",
        artist: "Arijit Singh",
        image: kesariya,
        year: 2022
    },
    {
        id: 's4',
        title: "Rinkiya Ke Papa",
        artist: "Manoj Tiwari",
        image: rinkiya,
        year: 2012
    },
    {
        id: 's5',
        title: "Tum Hi Ho",
        artist: "Arijit Singh",
        image: tumHiHo,
        year: 2013
    },
    {
        id: 's6',
        title: "Raataan Lambiyan",
        artist: "Jubin Nautiyal",
        image: shershaah,
        year: 2021
    }
];

// Additional data for "More sections"
export const TRENDING_NOW = [
    {
        id: 't1',
        title: "Pathaan",
        image: pathaan,
        rating: 7.5,
        year: 2023,
    },
    {
        id: 't2',
        title: "Drishyam 2",
        image: drishyam,
        rating: 8.2,
        year: 2022,
    },
    {
        id: 't3',
        title: "Kantara",
        image: kantaraImg,
        rating: 8.3,
        year: 2022,
    },
    {
        id: 't4',
        title: "RRR",
        image: rrrImg,
        rating: 8.0,
        year: 2022,
    },
    {
        id: 't5',
        title: "Pushpa",
        image: pushpaImg,
        rating: 7.6,
        year: 2021,
    }
];

export const ACTION_MOVIES = [
    {
        id: 'a1',
        title: "Jawan",
        image: jawanImg,
        rating: 7.8,
        year: 2023
    },
    {
        id: 'a2',
        title: "War",
        image: warImg,
        rating: 7.0,
        year: 2019
    },
    {
        id: 'a3',
        title: "Baaghi 3",
        image: baaghiImg,
        rating: 6.0,
        year: 2020
    },
    {
        id: 'a4',
        title: "KGF Chapter 2",
        image: kgfImg,
        rating: 8.4,
        year: 2022
    }
];

export const ORIGINALS = [
    {
        id: 'o1',
        title: "The Night Manager",
        image: familyMan, // Repeating family man 
        genre: "Thriller"
    },
    {
        id: 'o2',
        title: "Rocket Boys",
        image: farzi, // Repeating Farzi
        genre: "Drama"
    },
    {
        id: 'o3',
        title: "Made in Heaven",
        image: sacredGames, // Repeating Sacred Games
        genre: "Drama"
    },
    {
        id: 'o4',
        title: "Pataal Lok",
        image: mirzapur, // Repeating Mirzapur
        genre: "Crime"
    },
    {
        id: 'o5',
        title: "Special OPS",
        image: asurImg, // Repeating Asur
        genre: "Action"
    },
    {
        id: 'o6',
        title: "Breathe",
        image: sacredGames, // Repeating Sacred Games
        genre: "Thriller"
    }
];
