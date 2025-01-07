// Initialize the map
const map = L.map('map').setView([12.870219035448784, 80.21841715860253], 16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenStreetMap contributors',
}).addTo(map);

// GeoJSON data storage and sliding panel references
let allFeatures = [];
const slidingPanel = document.getElementById('sliding-panel');
const locationTitle = document.getElementById('location-title');
const locationDetails = document.getElementById('location-details');
const closePanelButton = document.getElementById('close-panel');
const locationImage = document.getElementById('location-image');

// Track the active input field (source or destination)
let activeInputField = null;

// Add focus event listeners to track active input field
document.getElementById('source').addEventListener('focus', () => {
    activeInputField = 'source';
});
document.getElementById('destination').addEventListener('focus', () => {
    activeInputField = 'destination';
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
                if (feature.properties && feature.properties.Name) {
                    // Add tooltip for quick identification
                    layer.bindTooltip(feature.properties.Name);

                    // Store feature data for search and routing
                    allFeatures.push({
                        name: feature.properties.Name,
                        details: feature.properties.description || 'No details available',
                        coordinates: feature.geometry.coordinates,
                        layer,
                        imageUrl: feature.properties.imageUrl || '',
                    });

                    // Add hover effect
                    layer.on('mouseover', () => {
                        layer.setStyle({ radius: 12, weight: 3, color: '#007bff' });
                    });
                    layer.on('mouseout', () => {
                        layer.setStyle({ radius: 8, weight: 1, color: '#3388ff' });
                    });

                    // Add click event for sliding panel and input field filling
                    layer.on('click', () => {
                        showSlidingPanel(
                            feature.properties.Name,
                            feature.properties.description,
                            feature.properties.imageUrl
                        );

                        // Automatically fill the active input field
                        if (activeInputField) {
                            document.getElementById(activeInputField).value = feature.properties.Name;
                            activeInputField = null;
                        }
                    });
                }
            },
        }).addTo(map);

        // Fit the map to the GeoJSON bounds
        map.fitBounds(geoJsonLayer.getBounds());
    })
    .catch((error) => console.error('Error loading GeoJSON:', error));

// Function to show the sliding panel
function showSlidingPanel(name, details, imageUrl) {
    locationTitle.textContent = name;

    // Check if imageUrl exists and is valid
    if (imageUrl) {
        locationImage.src = imageUrl;
        locationImage.alt = `${name} Image`;
        locationImage.style.display = 'block';

        // Add an error handler to set a default image if the URL fails
        locationImage.onerror = () => {
            locationImage.src = './assets/default-image.jpg'; // Path to your default image
            locationImage.alt = 'Default Image';
        };
    } else {
        // Hide the image if no URL is provided
        locationImage.style.display = 'none';
    }

    // Update location details
    if (details) {
        locationDetails.innerHTML = details.includes('\n')
            ? details.replace(/\n/g, '<br>')
            : details;
    } else {
        locationDetails.textContent = 'No details available.';
    }

    slidingPanel.classList.add('visible');
}

// Function to hide the sliding panel
function hideSlidingPanel() {
    slidingPanel.classList.remove('visible');
}

// Close button functionality
closePanelButton.addEventListener('click', hideSlidingPanel);

// Add search functionality with highlight effect
function initializeAutocomplete(inputId) {
    const inputField = document.getElementById(inputId);
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'autocomplete-suggestions';
    inputField.parentNode.appendChild(suggestionBox);

    inputField.addEventListener('input', () => {
        const query = inputField.value.toLowerCase();
        suggestionBox.innerHTML = '';

        if (query) {
            const matches = allFeatures.filter((f) =>
                f.name.toLowerCase().includes(query)
            );
            matches.forEach((match) => {
                const suggestion = document.createElement('div');
                suggestion.textContent = match.name;

                suggestion.addEventListener('click', () => {
                    inputField.value = match.name;
                    suggestionBox.innerHTML = '';
                    suggestionBox.style.display = 'none';

                    map.setView([match.coordinates[1], match.coordinates[0]], 18);
                    match.layer.openTooltip();
                    match.layer.setStyle({ radius: 15, color: '#ff0000' });

                    setTimeout(() => {
                        match.layer.setStyle({ radius: 8, color: '#3388ff' });
                    }, 3000);

                    if (inputId === 'search-box') {
                        showSlidingPanel(match.name, match.details, match.imageUrl);
                    }
                });

                suggestionBox.appendChild(suggestion);
            });

            suggestionBox.style.display = matches.length > 0 ? 'block' : 'none';
        } else {
            suggestionBox.style.display = 'none';
        }
    });

    inputField.addEventListener('blur', () => {
        setTimeout(() => (suggestionBox.style.display = 'none'), 200);
    });
}

initializeAutocomplete('search-box');
initializeAutocomplete('source');
initializeAutocomplete('destination');

// Routing functionality
let routeControl = null;
document.getElementById('draw-route-button').addEventListener('click', () => {
    const sourceName = document.getElementById('source').value.toLowerCase();
    const destinationName = document.getElementById('destination').value.toLowerCase();

    const source = allFeatures.find((f) => f.name.toLowerCase() === sourceName);
    const destination = allFeatures.find(
        (f) => f.name.toLowerCase() === destinationName
    );

    if (source && destination) {
        if (routeControl) map.removeControl(routeControl);

        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(source.coordinates[1], source.coordinates[0]),
                L.latLng(destination.coordinates[1], destination.coordinates[0]),
            ],
            routeWhileDragging: true,
        }).addTo(map);

        hideSlidingPanel();
    } else {
        alert('Invalid source or destination.');
    }
});

// Add back button to the map overlay
const backButton = document.createElement('button');
backButton.textContent = '←';
backButton.style.position = 'absolute';
backButton.style.top = '10px';
backButton.style.left = '10px';
backButton.style.padding = '5px 5px';
backButton.style.zIndex = '1001';
backButton.style.cursor = 'pointer';
backButton.style.fontSize = '20px';
backButton.style.color = '#fff';
backButton.style.backgroundColor = 'grey';
backButton.style.border = 'none';
backButton.style.borderRadius = '50%';
backButton.style.margin = "15px 20px";
backButton.style.opacity = "0.5";

backButton.addEventListener('click', () => {
    // Reset map view to default
    map.setView([12.870219035448784, 80.21841715860253], 16);

    // Clear any existing route
    if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }

    // Clear input fields
    document.getElementById('search-box').value = '';
    document.getElementById('source').value = '';
    document.getElementById('destination').value = '';

    // Hide suggestion boxes if visible
    document.querySelectorAll('.autocomplete-suggestions').forEach((box) => {
        box.innerHTML = '';
        box.style.display = 'none';
    });

    // Optionally, clear the sliding panel
    hideSlidingPanel();
});

document.body.appendChild(backButton);

// Add the Google Maps route button event listener
document.getElementById('google-maps-route-button').addEventListener('click', () => {
    const sourceName = document.getElementById('source').value.toLowerCase();
    const destinationName = document.getElementById('destination').value.toLowerCase();

    const source = allFeatures.find((f) => f.name.toLowerCase() === sourceName);
    const destination = allFeatures.find(
        (f) => f.name.toLowerCase() === destinationName
    );

    if (source && destination) {
        // Get the coordinates from GeoJSON data
        const sourceCoordinates = source.coordinates;
        const destinationCoordinates = destination.coordinates;

        // Create Google Maps URL for directions
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${sourceCoordinates[1]},${sourceCoordinates[0]}&destination=${destinationCoordinates[1]},${destinationCoordinates[0]}`;

        // Open the Google Maps route in a new window
        window.open(googleMapsUrl, '_blank');
    } else {
        alert('Invalid source or destination.');
    }
});



