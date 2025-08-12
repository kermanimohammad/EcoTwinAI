import * as data from './data.js';
import { isTreeModeActive } from './tree.js';

let selectedFeatureId = null;

function showPopupForFeature(feature, lngLat, map) {
    selectedFeatureId = feature.properties.ID;

    const properties = feature.properties;
    const popupContent = document.createElement('div');

    let tableHTML = '<table id="properties-table">';
    for (const key in properties) {
        const isReadOnly = key === 'ID';
        tableHTML += `<tr>
                        <td><input type="text" class="key-input" value="${key}" ${isReadOnly ? 'readonly' : ''}></td>
                        <td><input type="text" class="value-input" value="${properties[key]}" ${isReadOnly ? 'readonly' : ''}></td>
                        <td>${!isReadOnly ? `<button class="remove-btn" data-key="${key}">X</button>` : ''}</td>
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

    const popup = new mapboxgl.Popup().setLngLat(lngLat).setDOMContent(popupContent).addTo(map);

    const propertiesTable = popupContent.querySelector('#properties-table');
    propertiesTable.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-btn')) {
            event.target.closest('tr').remove();
        }
    });

    popupContent.querySelector('#add-row').addEventListener('click', () => {
        const newRow = propertiesTable.insertRow();
        newRow.innerHTML = `
            <td><input type="text" placeholder="key" class="key-input"></td>
            <td><input type="text" placeholder="value" class="value-input"></td>
            <td><button class="remove-btn">X</button></td>
        `;
    });

    popupContent.querySelector('#save-properties').addEventListener('click', () => {
        const newProperties = {};
        for (const row of propertiesTable.rows) {
            const keyInput = row.cells[0].querySelector('.key-input');
            const valueInput = row.cells[1].querySelector('.value-input');
            if (keyInput && valueInput) {
                const key = keyInput.value;
                const value = valueInput.value;
                if (key) newProperties[key] = isNaN(Number(value)) || value === '' ? value : Number(value);
            }
        }
        const featureToUpdate = data.buildingData.features.find(f => f.properties.ID === selectedFeatureId);
        if (featureToUpdate) {
            featureToUpdate.properties = newProperties;
            map.getSource('geojson-data').setData(data.buildingData);
        } else {
            alert("Could not find the feature to update.");
        }
        popup.remove();
    });
}

export function initializePopup(map) {
    map.on('click', 'geojson-layer', (e) => {
        if (isTreeModeActive()) return;
        showPopupForFeature(e.features[0], e.lngLat, map);
    });

    map.on('mouseenter', 'geojson-layer', () => {
        if (isTreeModeActive()) return;
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'geojson-layer', () => {
        map.getCanvas().style.cursor = '';
    });
}
