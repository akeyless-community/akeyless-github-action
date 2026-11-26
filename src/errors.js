// Describe an API error for the job log using only the HTTP status and the
// server's error text. The SDK error object also holds the full HTTP request,
// so it must never be logged as a whole.
function formatError(error) {
    if (typeof error !== 'object' || error === null) {
        return String(error);
    }
    const message = error.body?.error || error.message || error.error?.message || 'request failed';
    return error.status ? `${error.status} ${message}` : message;
}

exports.formatError = formatError;
