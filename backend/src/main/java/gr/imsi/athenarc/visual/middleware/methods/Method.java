package gr.imsi.athenarc.visual.middleware.methods;

import java.util.Map;

import gr.imsi.athenarc.visual.middleware.datasource.DataSource;

/**
 * Common interface for all query methods.
 */
public interface Method {
    /**
     * Initialize the method once. This can be where you build caches or set up
     * data structures, using the parameters given.
     *
     * @param dataSource         The data source to use
     * @param params             Extra parameters for the method (accuracy, etc.)
     */
    void initialize(DataSource dataSource, Map<String, String> params);

    /**
     * Execute a query using this method.
     *
     * @param dataSource         The data source to query
     * @param query Query object with from/to, measures, filter, etc.
     * @return QueryResults
     */
    VisualQueryResults executeQuery(DataSource dataSource, VisualQuery query);
}
