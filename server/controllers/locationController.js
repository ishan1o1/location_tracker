const axios = require('axios');

exports.calDistAndEta = async (origin, destination) => {
    const apiKey = process.env.ORS_API_KEY;
    const url = 'https://api.openrouteservice.org/v2/matrix/driving-car';

    try {
        const response = await axios.post(
            url,
            {
                locations: [
                    [origin.lng, origin.lat],
                    [destination.lng, destination.lat]
                ],
                metrics: ['distance', 'duration'],
                units: 'km'
            },
            {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const distanceData = response.data.distances[0][1];
        const durationData = response.data.durations[0][1];

        return {
            distance: `${distanceData.toFixed(2)} km`,
            duration: `${(durationData / 60).toFixed(2)} minutes`
        };

    } catch (err) {
        console.error('Error calculating distance and ETA:', err.message || err);
        throw err;
    }
};

exports.getRoute = async (req, res) => {
    const { start, end } = req.body || {};
    
    if (
        !start || !end ||
        typeof start.lat !== 'number' || typeof start.lng !== 'number' ||
        typeof end.lat !== 'number' || typeof end.lng !== 'number'
    ) {
        return res.status(400).json({ error: 'Valid start and end coordinates (lat, lng) are required.' });
    }

    const apiKey = (process.env.ORS_API_KEY || '').trim().replace(/;$/, '');
    if (!apiKey) {
        console.error('OpenRouteService API key missing in environment variables.');
        return res.status(500).json({ error: 'Routing service configuration missing.' });
    }

    const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

    try {
        const response = await axios.post(
            url,
            {
                coordinates: [
                    [start.lng, start.lat],
                    [end.lng, end.lat]
                ]
            },
            {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json(response.data);
    } catch (err) {
        console.error('Error fetching route from OpenRouteService:', err.response?.data || err.message);
        const status = err.response?.status || 500;
        const msg = err.response?.data?.error?.message || 'Failed to calculate route.';
        res.status(status).json({ error: msg });
    }
};
