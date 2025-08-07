// IMPORTANT: You need to replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your own Mapbox access token.
// You can get a token from https://account.mapbox.com/
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v12', // style URL
    center: [-74.5, 40], // starting position [lng, lat]
    zoom: 9 // starting zoom
});

// Add zoom and rotation controls to the map.
map.addControl(new mapboxgl.NavigationControl());

document.getElementById('load-geojson').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            addGeoJsonToMap(data);
        } catch (error) {
            alert("Error parsing GeoJSON file: " + error.message);
        }
    };
    reader.readAsText(file);
});

function addGeoJsonToMap(data) {
    // Center the map on the new data
    const center = turf.center(data).geometry.coordinates;
    map.flyTo({ center, zoom: 15 });

    if (map.getSource('geojson-data')) {
        map.getSource('geojson-data').setData(data);
    } else {
        map.addSource('geojson-data', {
            type: 'geojson',
            data: data
        });
    }

    if (map.getLayer('geojson-layer')) {
        map.removeLayer('geojson-layer');
    }

    map.addLayer({
        'id': 'geojson-layer',
        'type': 'fill-extrusion',
        'source': 'geojson-data',
        'paint': {
            'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'energy'],
                0, 'green',
                50, 'yellow',
                100, 'red'
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-opacity': 0.8,
            'fill-extrusion-base': 0
        }
    });
}

document.getElementById('save-geojson').addEventListener('click', () => {
    const source = map.getSource('geojson-data');
    if (source) {
        const data = JSON.stringify(source._data, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.geojson';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        alert("No data to save.");
    }
});

document.getElementById('reset').addEventListener('click', () => {
    if (map.getLayer('geojson-layer')) {
        map.removeLayer('geojson-layer');
    }
    if (map.getSource('geojson-data')) {
        map.removeSource('geojson-data');
    }

    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
});

let selectedFeatureId = null;

map.on('click', 'geojson-layer', (e) => {
    const feature = e.features[0];
    // Note: GeoJSON features are not guaranteed to have an 'id'.
    // If they do, it should be unique for this to work reliably.
    selectedFeatureId = feature.id;

    const properties = feature.properties;

    let html = `
        <div><strong>Building Properties</strong></div>
        <div id="popup-content">
            <table id="properties-table">
    `;
    for (const key in properties) {
        html += `<tr>
                    <td><input type="text" class="key-input" value="${key}"></td>
                    <td><input type="text" class="value-input" value="${properties[key]}"></td>
                 </tr>`;
    }
    html += `
            </table>
            <button id="add-row">Add Row</button>
            <button id="save-properties">Save</button>
        </div>
    `;

    const popup = new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);

    popup.on('open', () => {
        document.getElementById('add-row').addEventListener('click', () => {
            const table = document.getElementById('properties-table');
            const newRow = table.insertRow();
            newRow.innerHTML = `
                <td><input type="text" placeholder="key" class="key-input"></td>
                <td><input type="text" placeholder="value" class="value-input"></td>
            `;
        });

        document.getElementById('save-properties').addEventListener('click', () => {
            const table = document.getElementById('properties-table');
            const newProperties = {};
            for (const row of table.rows) {
                const keyInput = row.cells[0].querySelector('.key-input');
                const valueInput = row.cells[1].querySelector('.value-input');
                if (keyInput && valueInput) {
                    const key = keyInput.value;
                    const value = valueInput.value;
                    if (key) {
                        newProperties[key] = isNaN(Number(value)) || value === '' ? value : Number(value);
                    }
                }
            }

            const source = map.getSource('geojson-data');
            const data = JSON.parse(JSON.stringify(source._data));

            let featureToUpdate;
            if (selectedFeatureId !== undefined) {
                featureToUpdate = data.features.find(f => f.id === selectedFeatureId);
            }

            if (!featureToUpdate) {
                const clickedFeature = e.features[0];
                featureToUpdate = data.features.find(f =>
                    JSON.stringify(f.geometry) === JSON.stringify(clickedFeature.geometry) &&
                    JSON.stringify(f.properties) === JSON.stringify(clickedFeature.properties)
                );
            }

            if (featureToUpdate) {
                featureToUpdate.properties = newProperties;
                source.setData(data);
            } else {
                alert("Could not find the feature to update. For reliable editing, please ensure features have unique IDs.");
            }

            popup.remove();
        });
    });
});

// Change the cursor to a pointer when the mouse is over the states layer.
map.on('mouseenter', 'geojson-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'geojson-layer', () => {
    map.getCanvas().style.cursor = '';
});
