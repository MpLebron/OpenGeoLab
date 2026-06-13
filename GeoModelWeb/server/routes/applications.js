const express = require('express');
const {
    getApplicationSchemeDetail,
    listApplicationSchemes
} = require('../db/applicationSchemesRepository');

const router = express.Router();

router.get('/schemes', async (req, res) => {
    try {
        const payload = await listApplicationSchemes({
            page: req.query.page,
            limit: req.query.limit
        });

        res.json(payload);
    } catch (error) {
        console.error('[Applications] Error reading local schemes:', error.message);
        res.status(500).json({
            error: 'Failed to read local applications',
            message: error.message
        });
    }
});

router.get('/schemes/:id', async (req, res) => {
    try {
        const scheme = await getApplicationSchemeDetail(req.params.id);

        if (!scheme) {
            res.status(404).json({
                error: 'Application not found',
                message: 'No local application scheme was found for this identifier.'
            });
            return;
        }

        res.json(scheme);
    } catch (error) {
        console.error('[Applications] Error reading local scheme detail:', error.message);
        res.status(500).json({
            error: 'Failed to read local application detail',
            message: error.message
        });
    }
});

module.exports = router;
