const apiKey = '7294fc6a4f1a23021d706bdd650d1cf7';
const weatherResult = document.getElementById('weatherResult');
const errorMsg = document.getElementById('errorMsg');
const cityInput = document.getElementById('cityInput');
const autocompleteList = document.getElementById('autocomplete-list');
const getWeatherBtn = document.getElementById('getWeatherBtn');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');

let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Tema yönetimi
const setTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark');
        toggleThemeBtn.textContent = 'Açık Mod';
    } else {
        document.body.classList.remove('dark');
        toggleThemeBtn.textContent = 'Gece Modu';
    }
    localStorage.setItem('theme', theme);
};

const currentTheme = localStorage.getItem('theme') || 'light';
setTheme(currentTheme);

toggleThemeBtn.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(newTheme);
});

// Otomatik tamamlama için debounce fonksiyonu
const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

const updateAutocomplete = () => {
    const val = cityInput.value.toLowerCase();
    autocompleteList.innerHTML = '';
    if (!val) return;

    const filtered = searchHistory.filter(city => city.toLowerCase().startsWith(val));
    filtered.forEach(city => {
        const div = document.createElement('div');
        div.textContent = city;
        div.addEventListener('click', () => {
            cityInput.value = city;
            autocompleteList.innerHTML = '';
        });
        autocompleteList.appendChild(div);
    });
};

cityInput.addEventListener('input', debounce(updateAutocomplete, 300));

document.addEventListener('click', (e) => {
    if (e.target !== cityInput) {
        autocompleteList.innerHTML = '';
    }
});

getWeatherBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Lütfen şehir adı yazın!');
        return;
    }
    fetchWeather(city);
    cityInput.value = '';
    autocompleteList.innerHTML = '';
});

const showError = (msg) => {
    errorMsg.style.display = 'block';
    errorMsg.textContent = msg;
    setTimeout(() => errorMsg.style.display = 'none', 4000);
};

const getIconClass = (mainWeather) => {
    mainWeather = mainWeather.toLowerCase();
    if (mainWeather.includes('clear')) return 'wi-day-sunny';
    if (mainWeather.includes('cloud')) return 'wi-cloudy';
    if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) return 'wi-rain';
    if (mainWeather.includes('snow')) return 'wi-snow';
    if (mainWeather.includes('thunderstorm')) return 'wi-thunderstorm';
    return 'wi-na';
};

const changeThemeBasedOnWeather = (mainWeather) => {
    const weatherColors = {
        clear: '#FFD966',
        clouds: '#a9b7c6',
        rain: '#5f9ee6',
        drizzle: '#5f9ee6',
        snow: '#dff3fc',
        thunderstorm: '#563d7c'
    };

    const color = weatherColors[mainWeather] || 'linear-gradient(to bottom, #74ebd5 0%, #9face6 100%)';
    document.body.style.background = color;
};

const displayWeather = (data) => {
    const mainWeather = data.weather[0].main.toLowerCase();
    const iconClass = getIconClass(mainWeather);

    changeThemeBasedOnWeather(mainWeather);

    weatherResult.innerHTML = `
        <h2>${data.name} Hava Durumu</h2>
        <i class="wi ${iconClass}"></i>
        <p><strong>Sıcaklık:</strong> ${data.main.temp} °C</p>
        <p><strong>Hissedilen:</strong> ${data.main.feels_like} °C</p>
        <p><strong>Durum:</strong> ${data.weather[0].description}</p>
        <p><strong>Nem:</strong> ${data.main.humidity} %</p>
        <p><strong>Basınç:</strong> ${data.main.pressure} hPa</p>
        <p><strong>Rüzgar Hızı:</strong> ${data.wind.speed} m/s</p>
        <p id="uvIndex"><strong>UV İndeksi:</strong> Yükleniyor...</p>
    `;
};

const fetchUVIndex = async (lat, lon) => {
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${apiKey}`);
        const data = await res.json();
        if (data.current && data.current.uvi !== undefined) {
            document.getElementById('uvIndex').innerHTML = `<strong>UV İndeksi:</strong> ${data.current.uvi}`;
        } else {
            document.getElementById('uvIndex').innerHTML = `<strong>UV İndeksi:</strong> Bilgi yok`;
        }
    } catch {
        document.getElementById('uvIndex').innerHTML = `<strong>UV İndeksi:</strong> Bilgi alınamadı`;
    }
};

const fetchWeather = async (city) => {
    errorMsg.style.display = 'none';
    weatherResult.innerHTML = '<p>Yükleniyor...</p>';
    getWeatherBtn.disabled = true; // Butonu kilitle

    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&lang=tr&units=metric`);
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Şehir bulunamadı!');
        }
        const data = await res.json();

        if (!searchHistory.includes(data.name)) {
            searchHistory.push(data.name);
            if (searchHistory.length > 10) searchHistory.shift();
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        }
        displayWeather(data);
        await fetchUVIndex(data.coord.lat, data.coord.lon);
    } catch (err) {
        showError(err.message);
        weatherResult.innerHTML = '';
    } finally {
        getWeatherBtn.disabled = false; // Butonu aç
    }
};

// Sayfa yüklendiğinde konum iste ve hava durumunu getir
window.onload = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&lang=tr&units=metric`);
                const data = await res.json();
                if (data.cod === 200) {
                    displayWeather(data);
                    if (!searchHistory.includes(data.name)) {
                        searchHistory.push(data.name);
                        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
                    }
                    await fetchUVIndex(lat, lon);
                }
            } catch {
                weatherResult.innerHTML = '<p>Hava durumu bilgisi alınamadı.</p>';
            }
        }, () => {
            weatherResult.innerHTML = '<p>Konum erişimi reddedildi veya bulunamadı. Lütfen şehir adıyla arama yapın.</p>';
        });
    } else {
        weatherResult.innerHTML = '<p>Tarayıcınız konum servisini desteklemiyor.</p>';
    }
};
