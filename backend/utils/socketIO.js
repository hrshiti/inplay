/**
 * socketIO.js — Singleton accessor for the Socket.IO instance.
 *
 * Because the `io` object is created inside `startServer()` in server.js,
 * services that don't have access to `req` (e.g. userAuthService) can use
 * this module to get a reference to `io` for emitting events.
 *
 * Usage:
 *   In server.js  : require('./utils/socketIO').setIO(io);
 *   In services   : const { getIO } = require('../utils/socketIO');
 */

let _io = null;

/**
 * Store the Socket.IO server instance. Called once from server.js after io is created.
 * @param {import('socket.io').Server} io
 */
const setIO = (io) => {
  _io = io;
};

/**
 * Get the stored Socket.IO server instance.
 * Returns null if called before setIO() (e.g. during unit tests).
 * @returns {import('socket.io').Server|null}
 */
const getIO = () => _io;

module.exports = { setIO, getIO };
