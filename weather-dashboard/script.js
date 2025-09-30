// API Configuration
const API_KEY = 'MY_OPENWEATHERMAP_API_KEY'; // Replace with OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const currentWeather = document.getElementById('currentWeather');
const forecastContainer = document.getElementById('forecastContainer');
const recentCities = document.getElementById('recentCities');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorModal = document.getElementById('errorModal');
const errorMessage = document.getElementById('errorMessage');
const closeError = document.getElementById('closeError');
const searchSuggestions = document.getElementById('searchSuggestions');

// State
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// Popular cities for suggestions
const popularCities = [
    'London', 'New York', 'Tokyo', 'Paris', 'Dubai', 
    'Sydney', 'Singapore', 'Los Angeles', 'Hong Kong', 'Toronto'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    displayRecentSearches();
    showEmptyState();
});

// Setup Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    cityInput.addEventListener('input', handleSearchInput);
    cityInput.addEventListener('focus', () => {
        if (cityInput.value.trim()) {
            searchSuggestions.classList.add('active');
        }
    });
    locationBtn.addEventListener('click', getUserLocation);
    closeError.addEventListener('click', () => errorModal.classList.remove('active'));
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchSuggestions.classList.remove('active');
        }
    });
}

// Handle Search Input
function handleSearchInput(e) {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
        searchSuggestions.classList.remove('active');
        return;
    }

    const filtered = popularCities.filter(city => 
        city.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        displaySuggestions(filtered);
        searchSuggestions.classList.add('active');
    } else {
        searchSuggestions.classList.remove('active');
    }
}

// Display Suggestions
function displaySuggestions(cities) {
    searchSuggestions.innerHTML = cities.map(city => `
        <div class="suggestion-item" onclick="selectCity('${city}')">
            <i class="fas fa-map-marker-alt" style="margin-right: 10px; color: #667eea;"></i>
            ${city}
        </div>
    `).join('');
}

// Select City from Suggestions
function selectCity(city) {
    cityInput.value = city;
    searchSuggestions.classList.remove('active');
    handleSearch();
}

// Handle Search
async function handleSearch() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }

    await fetchWeatherData(city);
}

// Get User Location
function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            showLoading(false);
            showError('Unable to retrieve your location. Please enable location services.');
        }
    );
}

// Fetch Weather by Coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        showLoading(true);

        const currentResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );

        if (!currentResponse.ok) throw new Error('Weather data not found');

        const currentData = await currentResponse.json();
        
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );

        if (!forecastResponse.ok) throw new Error('Forecast data not found');

        const forecastData = await forecastResponse.json();

        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        addToRecentSearches(currentData.name, currentData.main.temp);
        
        cityInput.value = '';
        searchSuggestions.classList.remove('active');

    } catch (error) {
        showError(error.message || 'Failed to fetch weather data');
    } finally {
        showLoading(false);
    }
}

// Fetch Weather Data
async function fetchWeatherData(city) {
    try {
        showLoading(true);

        // Fetch current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`
        );

        if (!currentResponse.ok) {
            if (currentResponse.status === 404) {
                throw new Error('City not found. Please check the spelling and try again.');
            }
            throw new Error('Failed to fetch weather data');
        }

        const currentData = await currentResponse.json();

        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`
        );

        if (!forecastResponse.ok) throw new Error('Failed to fetch forecast data');

        const forecastData = await forecastResponse.json();

        // Display data
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        addToRecentSearches(city, currentData.main.temp);

        // Clear input
        cityInput.value = '';
        searchSuggestions.classList.remove('active');

    } catch (error) {
        showError(error.message || 'Failed to fetch weather data');
    } finally {
        showLoading(false);
    }
}

// Display Current Weather
function displayCurrentWeather(data) {
    const { name, sys, main, weather, wind, clouds } = data;
    const iconCode = weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    const date = new Date();
    const dateString = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    currentWeather.innerHTML = `
        <div class="city-name">
            <i class="fas fa-map-marker-alt"></i>
            ${name}, ${sys.country}
        </div>
        <div class="weather-date">${dateString}</div>
        
        <div class="weather-main">
            <img src="${iconUrl}" alt="${weather[0].description}" class="weather-icon-large">
            <div class="temperature-display">
                <div class="temperature">${Math.round(main.temp)}°C</div>
                <div class="weather-description">${weather[0].description}</div>
            </div>
        </div>

        <div class="weather-details">
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-temperature-high"></i>
                </div>
                <div class="detail-label">Feels Like</div>
                <div class="detail-value">${Math.round(main.feels_like)}°C</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-tint"></i>
                </div>
                <div class="detail-label">Humidity</div>
                <div class="detail-value">${main.humidity}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-wind"></i>
                </div>
                <div class="detail-label">Wind Speed</div>
                <div class="detail-value">${Math.round(wind.speed)} m/s</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-compress-arrows-alt"></i>
                </div>
                <div class="detail-label">Pressure</div>
                <div class="detail-value">${main.pressure} hPa</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="detail-label">Visibility</div>
                <div class="detail-value">${(data.visibility / 1000).toFixed(1)} km</div>
            </div>
            <div class="detail-item">
                <div class="detail-icon">
                    <i class="fas fa-cloud"></i>
                </div>
                <div class="detail-label">Cloudiness</div>
                <div class="detail-value">${clouds.all}%</div>
            </div>
        </div>
    `;
}

// Display 3-Day Forecast
function displayForecast(data) {
    // Get one forecast per day (at 12:00 PM)
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 3);

    forecastContainer.innerHTML = dailyForecasts.map(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const iconUrl = `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;

        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <img src="${iconUrl}" alt="${day.weather[0].description}" class="forecast-icon">
                <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
                <div class="forecast-description">${day.weather[0].description}</div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #666;">
                        <span><i class="fas fa-tint"></i> ${day.main.humidity}%</span>
                        <span><i class="fas fa-wind"></i> ${Math.round(day.wind.speed)} m/s</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Add to Recent Searches
function addToRecentSearches(city, temp) {
    // Remove if already exists
    recentSearches = recentSearches.filter(item => 
        item.city.toLowerCase() !== city.toLowerCase()
    );

    // Add to beginning
    recentSearches.unshift({ city, temp: Math.round(temp) });

    // Keep only last 6
    if (recentSearches.length > 6) {
        recentSearches = recentSearches.slice(0, 6);
    }

    // Save to localStorage
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));

    displayRecentSearches();
}

// Display Recent Searches
function displayRecentSearches() {
    if (recentSearches.length === 0) {
        recentCities.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-clock"></i>
                <p>No recent searches yet</p>
            </div>
        `;
        return;
    }

    recentCities.innerHTML = recentSearches.map(item => `
        <div class="recent-city-card" onclick="fetchWeatherData('${item.city}')">
            <div class="recent-city-name">${item.city}</div>
            <div class="recent-city-temp">${item.temp}°C</div>
        </div>
    `).join('');
}

// Show Empty State
function showEmptyState() {
    currentWeather.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-cloud-sun"></i>
            <h3>Welcome to Weather Dashboard</h3>
            <p>Search for a city or use your current location to get started</p>
        </div>
    `;

    forecastContainer.innerHTML = '';
}

// Show Loading
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

// Show Error
function showError(message) {
    errorMessage.textContent = message;
    errorModal.classList.add('active');
}

// Utility function to make fetchWeatherData available globally for onclick
window.fetchWeatherData = fetchWeatherData;
window.selectCity = selectCity;