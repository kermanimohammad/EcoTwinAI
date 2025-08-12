export function initializeSunSimulation(map) {
    const sunSimUIPairs = [
        { slider: 'sun-month-slider', input: 'sun-month-input' },
        { slider: 'sun-day-slider', input: 'sun-day-input' },
        { slider: 'sun-hour-slider', input: 'sun-hour-input' },
        { slider: 'sun-minute-slider', input: 'sun-minute-input' }
    ];

    function syncInputs(sliderEl, inputEl) {
        sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            updateSunPosition(map);
        });
        inputEl.addEventListener('input', () => {
            let value = parseInt(inputEl.value);
            const min = parseInt(inputEl.min);
            const max = parseInt(inputEl.max);
            if (isNaN(value)) return;
            if (value < min) value = min;
            if (value > max) value = max;
            inputEl.value = value;
            sliderEl.value = value;
            updateSunPosition(map);
        });
    }

    sunSimUIPairs.forEach(pair => {
        const slider = document.getElementById(pair.slider);
        const input = document.getElementById(pair.input);
        syncInputs(slider, input);
    });

    updateSunPosition(map); // Initial call
}

export function updateSunPosition(map) {
    const now = new Date();
    const year = now.getFullYear();
    const month = parseInt(document.getElementById('sun-month-slider').value) - 1;
    const day = parseInt(document.getElementById('sun-day-slider').value);
    const hour = parseInt(document.getElementById('sun-hour-slider').value);
    const minute = parseInt(document.getElementById('sun-minute-slider').value);

    const date = new Date(year, month, day, hour, minute);
    const lat = 40.7128;
    const lon = -74.0060;

    if (isNaN(date.getTime())) {
        console.error("Invalid date values for sun calculation.");
        return;
    }

    const sunPosition = SunCalc.getPosition(date, lat, lon);

    const sunAzimuth = (sunPosition.azimuth * 180 / Math.PI) + 180;
    const sunPolarAngle = 90 - (sunPosition.altitude * 180 / Math.PI);
    const sunIntensity = Math.max(0, Math.sin(sunPosition.altitude));

    map.setLights([
        {
            "id": "ambient_light",
            "type": "ambient",
            "properties": {
                "color": "white",
                "intensity": 0.5 * sunIntensity
            }
        },
        {
            "id": "directional_light",
            "type": "directional",
            "properties": {
                "color": "white",
                "intensity": 0.6 * sunIntensity,
                "direction": [sunAzimuth, Math.min(sunPolarAngle, 90)],
                "cast-shadows": true,
                "shadow-intensity": 0.7
            }
        }
    ]);
}
