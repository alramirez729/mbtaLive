// Vercel entry point. An Express app is already a (req, res) handler, so the same
// app that runs standalone on Render serves every /api/* route here, as one
// function rather than one cold start per endpoint.
//
// A single dynamic segment, not a catch-all: Vercel's zero-config routing for a
// plain Function only matched one segment in practice, so /api/mbta/vehicles fell
// through to a platform 404 while /api/health worked. The API is flat for that
// reason.
module.exports = require('../backend/server/app');
