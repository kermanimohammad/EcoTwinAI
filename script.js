// IMPORTANT: You need to replace 'YOUR_MAPBOX_ACCESS_TOKEN' with your own Mapbox access token.
// You can get a token from https://account.mapbox.com/
mapboxgl.accessToken = 'pk.eyJ1Ijoia2VybWFuaSIsImEiOiJjajF3a2p5bWQwMDAwMnFwbWFpcjQzZW52In0.aFYLXgdRHVofYKKd6JlFdw';

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

// --- Tree Creator ---

let currentTreeMode = null; // 'single', 'multi', 'delete'
let treeData = {
    type: 'FeatureCollection',
    features: []
};
let treeIdCounter = 0;

const treeModeSingleBtn = document.getElementById('tree-mode-single');
const treeModeMultiBtn = document.getElementById('tree-mode-multi');
const treeModeDeleteBtn = document.getElementById('tree-mode-delete');
const treeCreatorBtns = [treeModeSingleBtn, treeModeMultiBtn, treeModeDeleteBtn];

function setTreeMode(mode) {
    // If the same mode is clicked again, disable it.
    if (currentTreeMode === mode) {
        currentTreeMode = null;
    } else {
        currentTreeMode = mode;
    }

    // Update button styles
    treeCreatorBtns.forEach(btn => {
        if (btn.id === `tree-mode-${currentTreeMode}`) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Change cursor and map panning based on mode
    if (currentTreeMode) {
        map.getCanvas().style.cursor = 'crosshair';
        map.dragPan.disable();
    } else {
        map.getCanvas().style.cursor = '';
        map.dragPan.enable();
    }
}

treeModeSingleBtn.addEventListener('click', () => setTreeMode('single'));
treeModeMultiBtn.addEventListener('click', () => setTreeMode('multi'));
treeModeDeleteBtn.addEventListener('click', () => setTreeMode('delete'));

map.on('load', () => {
    map.addSource('trees-source', {
        type: 'geojson',
        data: treeData
    });

    map.addLayer({
        id: 'trees-layer',
        type: 'circle',
        source: 'trees-source',
        paint: {
            'circle-radius': 8,
            'circle-color': '#008000',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#004d00'
        }
    });
});

function placeTree(lngLat) {
    const newTree = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [lngLat.lng, lngLat.lat]
        },
        properties: {
            id: `tree-${treeIdCounter++}`
        }
    };
    treeData.features.push(newTree);
    map.getSource('trees-source').setData(treeData);
    return lngLat;
}

function deleteTreesAtPoint(point) {
    const features = map.queryRenderedFeatures(point, { layers: ['trees-layer'] });
    if (!features.length) return;

    const deletedTreeIds = features.map(f => f.properties.id);

    const initialFeatureCount = treeData.features.length;
    treeData.features = treeData.features.filter(f => !deletedTreeIds.includes(f.properties.id));

    // Only update the source if something was actually deleted
    if (treeData.features.length < initialFeatureCount) {
        map.getSource('trees-source').setData(treeData);
    }
}

map.on('click', (e) => {
    // This listener handles single-click actions for tree modes
    if (currentTreeMode === 'single') {
        placeTree(e.lngLat);
        // The mode is no longer disabled after a single click.
    } else if (currentTreeMode === 'delete') {
        deleteTreesAtPoint(e.point);
    }

    // Prevent click from propagating to other layers when in a tree mode
    if (currentTreeMode) {
        e.preventDefault();
    }
});

// --- Multi-Tree and Drag-to-Delete Logic ---
let isDragging = false;
let lastTreePosition = null;

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

map.on('mousedown', (e) => {
    if (currentTreeMode === 'multi') {
        isDragging = true;
        lastTreePosition = placeTree(e.lngLat);
    } else if (currentTreeMode === 'delete') {
        isDragging = true;
        // Also delete on mousedown in case it's a single click not a drag
        deleteTreesAtPoint(e.point);
    }
});

map.on('mousemove', throttle((e) => {
    if (!isDragging) return;

    if (currentTreeMode === 'multi') {
        const distance = turf.distance(
            turf.point([lastTreePosition.lng, lastTreePosition.lat]),
            turf.point([e.lngLat.lng, e.lngLat.lat]),
            { units: 'meters' }
        );
        const minDistance = document.getElementById('tree-distance').value;
        if (distance > minDistance) {
            lastTreePosition = placeTree(e.lngLat);
        }
    } else if (currentTreeMode === 'delete') {
        deleteTreesAtPoint(e.point);
    }
}, 100)); // Throttle to 100ms

map.on('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        lastTreePosition = null;
    }
});
