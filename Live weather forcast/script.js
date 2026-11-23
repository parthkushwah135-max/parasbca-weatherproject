
const weatherCodes = {
    0: ["Clear Sky", "☀️"],
    1: ["Mainly Clear", "🌤️"],
    2: ["Partly Cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Rime Fog", "🌫️"],
    51: ["Light Drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy Drizzle", "🌧️"],
    61: ["Light Rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy Rain", "🌧️"],
    71: ["Light Snow", "🌨️"],
    73: ["Snow", "❄️"],
    75: ["Heavy Snow", "❄️"],
    80: ["Rain Showers", "🌦️"],
    81: ["Rain Showers", "🌧️"],
    82: ["Heavy Rain Showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with Hail", "⛈️"],
    99: ["Severe Thunderstorm", "⛈️"]
};

function getWeather(code) {
    return weatherCodes[code] || ["Unknown Conditions", "🌡️"];
}

function showStatus(message) {
    document.getElementById("status").textContent = message;
}

async function searchWeather() {
    const city = document.getElementById("cityInput").value.trim();

    if (!city) {
        showStatus("Please enter a city name.");
        return;
    }

    try {
        showStatus("Searching for city...");

        const geoURL =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

        const geoResponse = await fetch(geoURL);

        if (!geoResponse.ok) {
            throw new Error("Location search service failed.");
        }

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found. Check the spelling.");
        }

        const location = geoData.results[0];

        await getWeatherData(
            location.latitude,
            location.longitude,
            [location.name, location.admin1, location.country]
                .filter(Boolean).join(", ")
        );

    } catch (error) {
        showStatus(error.message);
    }
}

async function getWeatherData(latitude, longitude, cityName) {
    try {
        showStatus("Getting latest available weather data...");

        const params = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,
            current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
            hourly: "temperature_2m,precipitation_probability,weather_code",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            forecast_days: "7",
            timezone: "auto"
        });

        const apiURL =
            `https://api.open-meteo.com/v1/forecast?${params}`;

        const response = await fetch(apiURL);

        if (!response.ok) {
            throw new Error("Weather service is unavailable.");
        }

        const data = await response.json();

        displayWeather(data, cityName);

        showStatus("Weather information updated successfully.");

    } catch (error) {
        showStatus(error.message);
    }
}

function displayWeather(data, cityName) {
    const current = data.current;
    const weather = getWeather(current.weather_code);

    document.getElementById("city").textContent = cityName;
    document.getElementById("temperature").textContent =
        Math.round(current.temperature_2m) + "°C";

    document.getElementById("icon").textContent = weather[1];
    document.getElementById("description").textContent = weather[0];

    document.getElementById("feels").textContent =
        Math.round(current.apparent_temperature) + "°C";

    document.getElementById("humidity").textContent =
        current.relative_humidity_2m + "%";

    document.getElementById("wind").textContent =
        Math.round(current.wind_speed_10m) + " km/h";

    const hourIndex = Math.max(
        0,
        data.hourly.time.findIndex(time => time >= current.time)
    );

    document.getElementById("rain").textContent =
        (data.hourly.precipitation_probability[hourIndex] ?? 0) + "%";

    displayHourly(data.hourly, hourIndex);
    displayDaily(data.daily);
}

function displayHourly(hourly, startIndex) {
    const container = document.getElementById("hourly");
    container.innerHTML = "";

    for (let i = startIndex; i < startIndex + 24; i++) {
        if (i >= hourly.time.length) break;

        const weather = getWeather(hourly.weather_code[i]);

        const time = i === startIndex
            ? "Now"
            : new Date(hourly.time[i]).toLocaleTimeString([], {
                hour: "numeric"
            });

        const card = document.createElement("div");
        card.className = "hour-card";

        card.innerHTML = `
            <p>${time}</p>
            <p>${weather[1]}</p>
            <h3>${Math.round(hourly.temperature_2m[i])}°</h3>
            <small>${hourly.precipitation_probability[i] ?? 0}% rain</small>
        `;

        container.appendChild(card);
    }
}

function displayDaily(daily) {
    const container = document.getElementById("daily");
    container.innerHTML = "";

    daily.time.forEach((date, i) => {
        const weather = getWeather(daily.weather_code[i]);

        const day = i === 0
            ? "Today"
            : new Date(date + "T12:00:00").toLocaleDateString([], {
                weekday: "long"
            });

        const row = document.createElement("div");
        row.className = "day-card";

        row.innerHTML = `
            <span>
                <strong>${day}</strong><br>
                <small>${weather[0]}</small>
            </span>
            <span>${weather[1]}</span>
            <strong>
                ${Math.round(daily.temperature_2m_max[i])}° /
                ${Math.round(daily.temperature_2m_min[i])}°
            </strong>
        `;

        container.appendChild(row);
    });
}

function getLocation() {
    if (!navigator.geolocation) {
        showStatus("Your browser does not support location.");
        return;
    }

    showStatus("Please allow location permission.");

    navigator.geolocation.getCurrentPosition(
        position => {
            getWeatherData(
                position.coords.latitude,
                position.coords.longitude,
                "Your Current Location"
            );
        },
        () => {
            showStatus(
                "Location permission denied. Please search for a city."
            );
        }
    );
}

// Default weather location: Aligarh, India
getWeatherData(27.8974, 78.0880, "Aligarh, India");
