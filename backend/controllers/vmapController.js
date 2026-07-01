const AppSetting = require('../models/AppSetting');

const formatTimeOffset = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
};

const buildAdBreakXml = (breakId, timeOffset, vastTagUrl) => {
    // Cache-bust the correlator param so DFP/GAM doesn't return a cached/duplicate ad for each break.
    const correlator = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
    const tagUrl = vastTagUrl.includes('correlator=')
        ? vastTagUrl.replace(/correlator=[^&]*/, `correlator=${correlator}`)
        : `${vastTagUrl}${vastTagUrl.includes('?') ? '&' : '?'}correlator=${correlator}`;

    return `
  <vmap:AdBreak timeOffset="${timeOffset}" breakType="linear" breakId="${breakId}">
    <vmap:AdSource id="${breakId}-source" allowMultipleAds="false" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${tagUrl}]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>`;
};

const emptyVmap = () => `<?xml version="1.0" encoding="UTF-8"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0"></vmap:VMAP>`;

// @desc    Generate a VMAP ad break schedule (pre-roll/mid-roll/post-roll) for the IMA SDK,
//          driven by admin-configured settings (adSettings.midRoll) instead of Google Ad Manager's own Ad Rules.
// @route   GET /api/vmap?duration=<seconds>
// @access  Public (requested directly by the IMA SDK running in the video player)
const getVmap = async (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    try {
        const duration = parseFloat(req.query.duration);
        const settings = await AppSetting.findOne();
        const midRoll = settings?.adSettings?.midRoll;

        if (!midRoll || !midRoll.enabled || !duration || duration < (midRoll.minVideoDurationSeconds || 0)) {
            return res.status(200).send(emptyVmap());
        }

        const breaks = [];

        if (midRoll.preRollEnabled) {
            breaks.push(buildAdBreakXml('preroll', 'start', midRoll.vastTagUrl));
        }

        const adsPerVideo = Math.max(0, midRoll.adsPerVideo || 0);
        for (let i = 0; i < adsPerVideo; i++) {
            const offsetSeconds = (duration * (i + 1)) / (adsPerVideo + 1);
            breaks.push(buildAdBreakXml(`midroll-${i + 1}`, formatTimeOffset(offsetSeconds), midRoll.vastTagUrl));
        }

        if (midRoll.postRollEnabled) {
            breaks.push(buildAdBreakXml('postroll', 'end', midRoll.vastTagUrl));
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0">${breaks.join('')}
</vmap:VMAP>`;

        res.status(200).send(xml);
    } catch (error) {
        res.status(200).send(emptyVmap());
    }
};

module.exports = { getVmap };
