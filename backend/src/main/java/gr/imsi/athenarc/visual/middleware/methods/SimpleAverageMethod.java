package gr.imsi.athenarc.visual.middleware.methods;

import gr.imsi.athenarc.visual.middleware.datasource.connector.DatasourceConnector;
import gr.imsi.athenarc.visual.middleware.datasource.connector.InfluxDBConnector;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.AbstractDataset;
import gr.imsi.athenarc.visual.middleware.datasource.executor.QueryExecutor;
import gr.imsi.athenarc.visual.middleware.domain.DataPoint;
import gr.imsi.athenarc.visual.middleware.domain.TimeRange;
import gr.imsi.athenarc.visual.middleware.methods.annotations.Parameter;
import gr.imsi.athenarc.visual.middleware.methods.annotations.VisualMethod;
import gr.imsi.athenarc.visual.middleware.util.DateTimeUtil;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * SimpleAverageMethod - Example implementation of a visual method
 * 
 * This class demonstrates how to implement a basic time series visualization method
 * that computes averages over specified time intervals. It serves as a reference
 * implementation showing proper usage of the middleware framework.
 */
@VisualMethod(
    name = "ExampleAverage",
    description = "An example method that computes averages over time intervals"
)
public class SimpleAverageMethod implements Method {

    Map<String, DatasourceConnector> dataSourceConnnectors = new HashMap<>();

    @Parameter(
        name = "Interval (ms)",
        description = "The aggregation interval in milliseconds",
        min = 1000,
        max = 12000000000L,
        step = 10000,
        defaultValue = 10000, 
        isQueryParameter = true
    )
    private long interval; 

    /**
     * Initializes the method with the given parameters. Validates that:
     * 1. The connector is an InfluxDB connector
     * 2. Required interval parameter is provided
     */
    @Override
    public void initialize(String schema, String datasetId, DatasourceConnector datasourceConnector, Map<String, String> params) {
        if(!(datasourceConnector instanceof InfluxDBConnector)) {
            throw new UnsupportedOperationException("Unsupported executor type");
        }
        dataSourceConnnectors.put(datasetId, datasourceConnector);    
    }

    /**
     * Executes the visual query by:
     * 1. Creating an appropriate InfluxDB Flux query
     * 2. Executing the query through the datasource connector
     * 3. Processing and returning the results
     */
    @Override
    public VisualQueryResults executeQuery(VisualQuery query) {
        String dbQuery = createAverageQuery(query);  // Changed to pass the full query object
        if (query.getParams().containsKey("interval")) {
            interval = Long.parseLong(query.getParams().get("interval"));
        } else {
            throw new IllegalArgumentException("Missing prefetchingFactor parameter for MinMaxCache method");
        }
        VisualQueryResults results = new VisualQueryResults();
        DatasourceConnector datasourceConnector = dataSourceConnnectors.get(query.getTable());
        AbstractDataset dataset = datasourceConnector.initializeDataset(query.getSchema(), query.getTable());
        QueryExecutor queryExecutor = datasourceConnector.initializeQueryExecutor(dataset);
        try {
            double startTime = System.currentTimeMillis();
            Map<Integer, List<DataPoint>> data = queryExecutor.execute(dbQuery);
            results.setData(data);
            results.setTimeRange(new TimeRange(query.getFrom(), query.getTo()));
            results.setQueryTime(System.currentTimeMillis() - startTime);
            results.setIoCount(data.size());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return results;
    }

    /**
     * Creates a Flux query that:
     * 1. Selects data from the specified bucket (schema)
     * 2. Filters for the exact time range from the visual query
     * 3. Applies mean aggregation over the specified interval
     */
    private String createAverageQuery(VisualQuery query) {
        String format = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
        return String.format(
                "from(bucket: \"%s\") " +
                "|> range(start: %s, stop: %s) " +  // Changed to use specific timestamps
                "|> filter(fn: (r) => r[\"_measurement\"] == \"%s\") " +
                "|> aggregateWindow(every: %dms, fn: mean, createEmpty: false) " +
                "|> yield(name: \"mean\")",
                query.getSchema(), 
                DateTimeUtil.format(query.getFrom(), format),
                DateTimeUtil.format(query.getTo(), format),
                query.getTable(), 
                interval
        );
    }
}
