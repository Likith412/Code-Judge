const pageView = (key, rows, total, query) => ({
   [key]: rows,
   page: query.page,
   limit: query.limit,
   total,
   totalPages: Math.max(1, Math.ceil(total / query.limit)),
});

module.exports = { pageView };
