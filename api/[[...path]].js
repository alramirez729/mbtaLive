// Vercel entry point. An Express app is already a (req, res) handler, so the
// same app that runs standalone on Render serves every /api/* route here.
// The catch-all filename keeps this as a single function instead of one cold
// start per endpoint.
module.exports = require('../backend/server/app');
