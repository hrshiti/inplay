/**
 * Middleware to log all incoming requests and their responses
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // Log the incoming request
    console.log(`\n--- [REQUEST] ${new Date().toISOString()} ---`);
    console.log(`${method} ${originalUrl}`);
    console.log(`From: ${ip} | UA: ${userAgent}`);
    
    // Don't log full body for very large requests or uploads to avoid console clutter
    if (req.body && !originalUrl.includes('upload')) {
        const body = { ...req.body };
        // Mask passwords if any
        if (body.password) body.password = '********';
        console.log(`Body:`, JSON.stringify(body, null, 2));
    }

    // Capture the original res.send to log the response body
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - start;
        
        console.log(`--- [RESPONSE] ${method} ${originalUrl} ---`);
        console.log(`Status: ${res.statusCode} | Duration: ${duration}ms`);
        
        // Only log JSON responses to avoid binary/html clutter
        const contentType = res.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            try {
                const parsedData = JSON.parse(data);
                console.log(`Response Body:`, JSON.stringify(parsedData, null, 2));
            } catch (e) {
                // If not JSON, just log a snippet
                console.log(`Response Body (Raw):`, data.toString().substring(0, 500) + (data.length > 500 ? '...' : ''));
            }
        }
        console.log(`-------------------------------------------\n`);

        return originalSend.apply(res, arguments);
    };

    next();
};

module.exports = requestLogger;
