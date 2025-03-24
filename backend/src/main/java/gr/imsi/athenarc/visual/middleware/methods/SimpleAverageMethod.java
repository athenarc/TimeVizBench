package gr.imsi.athenarc.visual.middleware.methods;

import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.datasource.InfluxDBDatasource;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.AbstractDataset;
import gr.imsi.athenarc.visual.middleware.datasource.executor.QueryExecutor;
import gr.imsi.athenarc.visual.middleware.domain.DataPoint;
import gr.imsi.athenarc.visual.middleware.domain.DateTimeUtil;
import gr.imsi.athenarc.visual.middleware.domain.TimeRange;
import gr.imsi.athenarc.visual.middleware.methods.annotations.Parameter;
import gr.imsi.athenarc.visual.middleware.methods.annotations.VisualMethod;

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

    Map<String, DataSource> dataSources = new HashMap<>();

    @Parameter(
        name = "Interval (ms)",
        description = "The aggregation interval in milliseconds",
        min = -1,
        max = 12000000000L,
        step = 10000,
        defaultValue = -1, 
        isQueryParameter = true
    )
    private long interval; 

    /**
     * Initializes the method with the given parameters. Validates that:
     * 1. The connector is an InfluxDB connector
     * 2. Required interval parameter is provided
     */
    @Override
    public void initialize(DataSource dataSource, Map<String, String> params) {
        dataSources.put(dataSource.getDataset().getId(), dataSource);    
    }

    /**
     * Executes the visual query by:
     * 1. Creating an appropriate InfluxDB Flux query
     * 2. Executing the query through the datasource connector
     * 3. Processing and returning the results
     */
    @Override
    public VisualQueryResults executeQuery(VisualQuery query) {

        VisualQueryResults results = new VisualQueryResults();
        DataSource dataSource = dataSources.get(query.getTable());

        try {
            double startTime = System.currentTimeMillis();
            Map<Integer, List<DataPoint>> allData = new HashMap<>();
            
            // Process each measure in the query
            for (Integer measureId : query.getMeasures()) {
                String dbQuery = createAverageQuery(query, dataSource.getDataset(), measureId);
                Map<Integer, List<DataPoint>> measureData = dataSource.execute(dbQuery);
                // Add this measure's data to the combined results
                allData.putAll(measureData);
            }
            
            results.setData(allData);
            results.setTimeRange(new TimeRange(query.getFrom(), query.getTo()));
            results.setQueryTime((System.currentTimeMillis() - startTime) / 1000);
            results.setIoCount(allData.entrySet().stream().mapToInt(e -> e.getValue().size()).sum());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return results;
    }

    /**
     * Creates a Flux query that:
     * 1. Selects data from the specified bucket (schema)
     * 2. Filters for the exact time range from the visual query
     * 3. Filters for a specific measure using the dataset header
     * 4. Applies mean aggregation over pixel-based time intervals
     */
    private String createAverageQuery(VisualQuery query, AbstractDataset dataset, int measureId) {
        String format = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";
        
        if (query.getParams().containsKey("interval")) {
            interval = Long.parseLong(query.getParams().get("interval"));
            if(interval <= 0) {
                interval = (query.getTo() - query.getFrom())/ query.getWidth();
            }
        } else {
            throw new IllegalArgumentException("Invalid interval parameter for SimpleAverage method");
        }
        // Calculate pixel-based interval
        
        // Get field name from dataset header if available
        String fieldName = "value" + measureId;
        if (dataset.getHeader() != null && measureId < dataset.getHeader().length) {
            fieldName = dataset.getHeader()[measureId];
        }
                
        return String.format(
                "from(bucket: \"%s\") " +
                "|> range(start: %s, stop: %s) " +
                "|> filter(fn: (r) => r[\"_measurement\"] == \"%s\") " +
                "|> filter(fn: (r) => r[\"_field\"] == \"%s\") " + // Use field name from header when available
                "|> aggregateWindow(every: %dms, fn: mean, createEmpty: false) " +
                "|> yield(name: \"mean\")",
                query.getSchema(), 
                DateTimeUtil.format(query.getFrom(), format),
                DateTimeUtil.format(query.getTo(), format),
                query.getTable(),
                fieldName,
                interval
        );
    }
}
