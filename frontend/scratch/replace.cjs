const fs = require('fs');
const path = 'd:/Github/inplay/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/heroMovies\.slice\(0, 5\)/g, 'heroMovies.slice(0, 20)');
content = content.replace(/displayCinemaHeroMovies\.slice\(0, 5\)/g, 'displayCinemaHeroMovies.slice(0, 20)');
content = content.replace(/displayBhojpuriHeroMovies\.slice\(0, 5\)/g, 'displayBhojpuriHeroMovies.slice(0, 20)');
content = content.replace(/displayDarmaaHeroMovies\.slice\(0, 5\)/g, 'displayDarmaaHeroMovies.slice(0, 20)');

content = content.replace(/Math\.min\(heroMovies\.length, 5\)/g, 'Math.min(heroMovies.length, 20)');
content = content.replace(/Math\.min\(displayCinemaHeroMovies\.length, 5\)/g, 'Math.min(displayCinemaHeroMovies.length, 20)');
content = content.replace(/Math\.min\(displayBhojpuriHeroMovies\.length, 5\)/g, 'Math.min(displayBhojpuriHeroMovies.length, 20)');
content = content.replace(/Math\.min\(displayDarmaaHeroMovies\.length, 5\)/g, 'Math.min(displayDarmaaHeroMovies.length, 20)');

fs.writeFileSync(path, content, 'utf8');
console.log('Replaced successfully');
