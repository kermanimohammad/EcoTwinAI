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
            data: data,
            promoteId: 'ID' // Use the 'ID' property from the GeoJSON as the feature id
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
                ['get', 'TotalEnergy'],
                50, 'green',
                100, 'yellow',
                150, 'red'
            ],
            'fill-extrusion-height': ['get', 'Height'],
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
    selectedFeatureId = feature.id; // This will be the 'ID' property from the GeoJSON

    const properties = feature.properties;

    const popupContent = document.createElement('div');

    let tableHTML = '<table id="properties-table">';
    for (const key in properties) {
        const isReadOnly = key === 'ID';
        tableHTML += `<tr>
                        <td><input type="text" class="key-input" value="${key}" ${isReadOnly ? 'readonly' : ''}></td>
                        <td><input type="text" class="value-input" value="${properties[key]}" ${isReadOnly ? 'readonly' : ''}></td>
                        <td>${!isReadOnly ? '<button class="remove-btn">X</button>' : ''}</td>
                     </tr>`;
    }
    tableHTML += '</table>';

    popupContent.innerHTML = `
        <div><strong>Building Properties</strong></div>
        <div id="popup-content">
            ${tableHTML}
            <button id="add-row">Add Row</button>
            <button id="save-properties">Save</button>
        </div>
    `;

    const popup = new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setDOMContent(popupContent)
        .addTo(map);

    const addRowBtn = popupContent.querySelector('#add-row');
    const saveBtn = popupContent.querySelector('#save-properties');
    const propertiesTable = popupContent.querySelector('#properties-table');

    propertiesTable.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-btn')) {
            const row = event.target.closest('tr');
            row.remove();
        }
    });

    addRowBtn.addEventListener('click', () => {
        const newRow = propertiesTable.insertRow();
        newRow.innerHTML = `
            <td><input type="text" placeholder="key" class="key-input"></td>
            <td><input type="text" placeholder="value" class="value-input"></td>
            <td><button class="remove-btn">X</button></td>
        `;
    });

    saveBtn.addEventListener('click', () => {
        const newProperties = {};
        for (const row of propertiesTable.rows) {
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

        const featureToUpdate = data.features.find(f => f.properties.ID === selectedFeatureId);

        if (featureToUpdate) {
            featureToUpdate.properties = newProperties;
            source.setData(data);
        } else {
            alert("Could not find the feature to update. This should not happen if features have a unique 'ID' property.");
        }

        popup.remove();
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
