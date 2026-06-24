require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Secure API endpoint - token is hidden on server
app.get('/api/stats', async (req, res) => {
    const companyId = process.env.TRUCKY_COMPANY_ID;
    const apiToken = process.env.TRUCKY_API_TOKEN;

    if (!companyId) {
        return res.json({
            members: 150,
            kmDriven: 50000,
            jobs: 1250,
            error: 'Not configured - showing demo data'
        });
    }

    try {
        const headers = {
            'User-Agent': 'Midnight Mile',
            'Accept': 'application/json'
        };

        if (apiToken) {
            headers['x-access-token'] = apiToken;
        }

        // Fetch member count (public)
        const companyRes = await fetch(
            `https://e.truckyapp.com/api/v1/company/${companyId}`,
            { headers }
        );
        const companyData = companyRes.ok ? await companyRes.json() : {};

        // Fetch stats (requires token for full data)
        let jobs = 0;
        let kmDriven = 0;

        if (apiToken) {
            const statsRes = await fetch(
                `https://e.truckyapp.com/api/v1/company/${companyId}/stats`,
                { headers }
            );
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                jobs = statsData.jobs || 0;
            }

            // Fetch KM from eco stats
            const now = new Date();
            const ecoRes = await fetch(
                `https://e.truckyapp.com/api/v1/company/${companyId}/stats/eco/monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
                { headers }
            );
            if (ecoRes.ok) {
                const ecoData = await ecoRes.json();
                kmDriven = Math.round(ecoData.driven_distance || 0);
            }
        }

        res.json({
            members: companyData.members_count || 0,
            kmDriven: kmDriven,
            jobs: jobs
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Fallback to index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚛 Midnight Mile server running on port ${PORT}`);
});