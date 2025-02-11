// Initialize the map
const map = L.map('map').setView([12.870219035448784, 80.21841715860253], 16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors',
}).addTo(map);

// DOM Elements
const slidingPanel = document.getElementById('sliding-panel');
const locationTitle = document.getElementById('location-title');
const locationDetails = document.getElementById('location-details');
const closePanelButton = document.getElementById('close-panel');
const locationImage = document.getElementById('location-image');
const sourceInput = document.getElementById('source');
const destinationInput = document.getElementById('destination');
const searchBox = document.getElementById('search-box');
const drawRouteButton = document.getElementById('draw-route-button');
const googleMapsRouteButton = document.getElementById('google-maps-route-button');

// Variables
let allFeatures = [];
let activeInputField = null;
let routeControl = null;

// Track active input field (source or destination)
[sourceInput, destinationInput].forEach((input) => {
    input.addEventListener('focus', () => (activeInputField = input.id));
});
document.addEventListener('click', (event) => {
    if (!event.target.closest('#source') && !event.target.closest('#destination')) {
        activeInputField = null;
    }
});

// Load GeoJSON data
fetch('./assets/college_map.geojson')
    .then((response) => response.json())
    .then((data) => {
        const geoJsonLayer = L.geoJSON(data, {
            onEachFeature: (feature, layer) => {
                if (!feature.properties?.Name) return;

                // Store feature data for search and routing
                const featureData = {
                    name: feature.properties.Name,
                    details: feature.properties.description || 'No details available',
                    coordinates: feature.geometry.coordinates,
                    layer,
                    imageUrl: feature.properties.imageUrl || '',
                };
                allFeatures.push(featureData);

                // Add tooltip for quick identification
                layer.bindTooltip(feature.properties.Name);

                // Hover effect
                layer.on('mouseover', () => highlightLayer(layer, true));
                layer.on('mouseout', () => highlightLayer(layer, false));

                // Click event to show panel and autofill input
                layer.on('click', () => {
                    showSlidingPanel(featureData);
                    if (activeInputField) {
                        document.getElementById(activeInputField).value = feature.properties.Name;
                        activeInputField = null;
                    }
                    highlightLayer(layer, true, 3000); // Highlight selected for 3 seconds
                });
            },
        }).addTo(map);

        // Fit map to GeoJSON bounds
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch((error) => console.error('Error loading GeoJSON:', error));

// Highlight layer function
function highlightLayer(layer, highlight, timeout = 0) {
    if (!layer.setStyle) return;
    layer.setStyle({ radius: highlight ? 15 : 8, weight: highlight ? 3 : 1, color: highlight ? '#ff0000' : '#3388ff' });

    if (timeout) {
        setTimeout(() => layer.setStyle({ radius: 8, color: '#3388ff' }), timeout);
    }
}

// Show sliding panel
function showSlidingPanel({ name, details, imageUrl }) {
    locationTitle.textContent = name;
    locationImage.style.display = imageUrl ? 'block' : 'none';
    locationImage.src = imageUrl || './assets/default-image.jpg';
    locationImage.alt = `${name} Image`;
    locationImage.onerror = () => (locationImage.src = './assets/default-image.jpg');
    locationDetails.innerHTML = details.replace(/\n/g, '<br>') || 'No details available.';
    slidingPanel.classList.add('visible');
}

// Hide sliding panel
closePanelButton.addEventListener('click', () => slidingPanel.classList.remove('visible'));

// Autocomplete search functionality
function initializeAutocomplete(input) {
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    input.parentNode.appendChild(suggestionBox);

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        suggestionBox.innerHTML = '';

        if (!query) return (suggestionBox.style.display = 'none');

        const matches = allFeatures.filter((f) => f.name.toLowerCase().includes(query));
        matches.forEach((match) => {
            const suggestion = document.createElement('div');
            suggestion.textContent = match.name;
            suggestion.addEventListener('click', () => {
                input.value = match.name;
                suggestionBox.style.display = 'none';
                map.setView([match.coordinates[1], match.coordinates[0]], 18);
                match.layer.openTooltip();
                highlightLayer(match.layer, true, 3000);
                if (input.id === 'search-box') showSlidingPanel(match);
            });
            suggestionBox.appendChild(suggestion);
        });

        suggestionBox.style.display = matches.length ? 'block' : 'none';
    });

    document.addEventListener('click', (event) => {
        if (!input.contains(event.target) && !suggestionBox.contains(event.target)) {
            suggestionBox.style.display = 'none';
        }
    });
}

// Initialize autocomplete for input fields
[searchBox, sourceInput, destinationInput].forEach(initializeAutocomplete);

// Draw route
drawRouteButton.addEventListener('click', () => {
    const source = allFeatures.find((f) => f.name.toLowerCase() === sourceInput.value.toLowerCase());
    const destination = allFeatures.find((f) => f.name.toLowerCase() === destinationInput.value.toLowerCase());

    if (!source || !destination) return alert('Invalid source or destination.');

    if (routeControl) map.removeControl(routeControl);

    routeControl = L.Routing.control({
        waypoints: [L.latLng(source.coordinates[1], source.coordinates[0]), L.latLng(destination.coordinates[1], destination.coordinates[0])],
        routeWhileDragging: true,
    }).addTo(map);

    slidingPanel.classList.remove('visible');
});

// Reset button to clear routes and inputs
const backButton = document.createElement('button');
backButton.textContent = '⟳';
Object.assign(backButton.style, {
    position: 'absolute', top: '-5px', left: '30px', padding: '2px 5px', zIndex: '1201',
    cursor: 'pointer', fontSize: '20px', color: 'black', backgroundColor: 'white',
    border: ' 1px solid  grey', borderRadius: ' 5px', margin: '15px 20px', 
});

backButton.addEventListener('click', () => {
    map.setView([12.870219035448784, 80.21841715860253], 16);
    if (routeControl) map.removeControl(routeControl);
    [searchBox, sourceInput, destinationInput].forEach((input) => (input.value = ''));
    document.querySelectorAll('.autocomplete-suggestions').forEach((box) => (box.innerHTML = '', box.style.display = 'none'));
    slidingPanel.classList.remove('visible');
});
document.body.appendChild(backButton);

// Google Maps redirection
googleMapsRouteButton.addEventListener('click', () => {
    const source = allFeatures.find((f) => f.name.toLowerCase() === sourceInput.value.toLowerCase());
    const destination = allFeatures.find((f) => f.name.toLowerCase() === destinationInput.value.toLowerCase());

    if (!source || !destination) return alert('Invalid source or destination.');

    window.open(`https://www.google.com/maps/dir/?api=1&origin=${source.coordinates[1]},${source.coordinates[0]}&destination=${destination.coordinates[1]},${destination.coordinates[0]}`, '_blank');
});
document.addEventListener("DOMContentLoaded", function () {
    const overlay = document.querySelector(".map-overlay");
    const toggleBtn = document.createElement("button");
    
    toggleBtn.id = "toggle-overlay-btn";
    toggleBtn.innerHTML = "&#62;"; // '>' icon for sliding in
    document.body.appendChild(toggleBtn);

    // Set initial button position
    toggleBtn.style.position = "absolute";
    toggleBtn.style.top = "30%"; 
    toggleBtn.style.marginLeft = "0px"; // Default when visible

    // Toggle overlay visibility
    toggleBtn.addEventListener("click", function () {
        if (overlay.classList.contains("visible")) {
            overlay.classList.remove("visible");
            toggleBtn.innerHTML = "&#62;"; // Change to '>'
            toggleBtn.style.marginLeft = "0px";  // When hidden
        } else {
            overlay.classList.add("visible");
            toggleBtn.innerHTML = "&#60;"; // Change to '<'
            toggleBtn.style.marginLeft = "340px";  // When visible
        }
    });
});
