import { initializeMap } from './map.js';
import { initializeUI } from './ui.js';
import { initializePopup } from './popup.js';
import { initializeTreeCreator } from './tree.js';
import { initializeSunSimulation } from './sun.js';

// This is the main entry point of the application.
// It initializes the map and then sets up all the different functionalities.

const map = initializeMap();

// Once the map is available, initialize the other modules that depend on it.
if (map) {
    initializeUI(map);
    initializePopup(map);
    initializeTreeCreator(map);
    initializeSunSimulation(map);
} else {
    console.error("Map could not be initialized.");
}
