// ============================================================================
// CLOUDINARY STUB - This file exists only for backward compatibility
// All Cloudinary functionality has been removed
// Use config/multerStorage.js for file uploads
// ============================================================================

// Stub exports to prevent import errors
const generateSignedUrl = (url) => url; // Just return the URL as-is
const generateHLSUrl = (url) => url;    // Just return the URL as-is
const getVideoInfo = async () => ({ duration: 0, width: 0, height: 0 });

module.exports = {
  generateSignedUrl,
  generateHLSUrl,
  getVideoInfo
};
