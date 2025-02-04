package gr.imsi.athenarc.visual.middleware.methods;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import gr.imsi.athenarc.visual.middleware.cache.MinMaxCache;
import gr.imsi.athenarc.visual.middleware.cache.MinMaxCacheBuilder;
import gr.imsi.athenarc.visual.middleware.cache.query.Query;
import gr.imsi.athenarc.visual.middleware.cache.query.QueryResults;
import gr.imsi.athenarc.visual.middleware.datasource.connector.DatasourceConnector;
import gr.imsi.athenarc.visual.middleware.methods.annotations.Parameter;
import gr.imsi.athenarc.visual.middleware.methods.annotations.VisualMethod;

@VisualMethod(
    name = "MinMaxCache",
    description = "Cache-based visualization method using min-max aggregates"
)
public class MinMaxCacheMethod implements Method {
    private static final Logger LOG = LoggerFactory.getLogger(MinMaxCacheMethod.class);

    @Parameter(
        name = "Data Reduction Factor",
        description = "Controls the data reduction ratio (Integer)",
        min = 0,
        max = 12,
        step = 1,
        defaultValue = 6
    )
    private int dataReductionRatio;

    @Parameter(
        name = "Prefetching Factor",
        description = "Controls the prefetching amount (Float)",
        min = 0,
        max = 1,
        step = 0.1,
        defaultValue = 0
    )
    private float prefetchingFactor;

    @Parameter(
        name = "Aggregation Factor",
        description = "Controls the aggregation level (Integer)",
        min = 2,
        max = 16,
        step = 2,
        defaultValue = 4
    )
    private int aggFactor;

    @Parameter(
        name = "Accuracy",
        description = "Controls the accuracy of results (Float)",
        min = 0,
        max = 1,
        step = 0.01,
        defaultValue = 0.95,
        isQueryParameter = true
    )
    private float accuracy;

    // Map to hold the minmaxcache of each dataset
    private final ConcurrentHashMap<String, MinMaxCache> cacheMap = new ConcurrentHashMap<>();
   
    @Override
    public void initialize(String schema, String datasetId, DatasourceConnector datasourceConnector, Map<String, String> params) {
        LOG.info("Initializing MinMaxCacheMethod for dataset = {}", datasetId);

        // Extract initialization parameters from the 'params' map as needed
        initializeInitParameters(params);
        
        // Build and store the MinMaxCache for the dataset
        cacheMap.computeIfAbsent(datasetId, key -> {
            return new MinMaxCacheBuilder()
                .setDatasourceConnector(datasourceConnector)
                .setSchema(schema)
                .setId(datasetId)
                .setPrefetchingFactor(prefetchingFactor)
                .setAggFactor(aggFactor)
                .setDataReductionRatio(dataReductionRatio)
                .build();
        });
    }

    @Override
    public VisualQueryResults executeQuery(VisualQuery visualQuery) {
        LOG.info("Executing MinMaxCache query for dataset = {}", visualQuery.getTable());
        MinMaxCache minMaxCache = cacheMap.get(visualQuery.getTable());
        if (minMaxCache == null) {
            throw new IllegalStateException("Method not initialized for dataset. Call initialize() first.");
        }
        long from = visualQuery.getFrom();
        long to = visualQuery.getTo();
        int width = visualQuery.getWidth();
        int height = visualQuery.getHeight();
        List<Integer> measures = visualQuery.getMeasures();
        Map<Integer, Double[]> filter = null;
        if (visualQuery.getParams().containsKey("accuracy")) {
            prefetchingFactor = Float.parseFloat(visualQuery.getParams().get("accuracy"));
        } else {
            throw new IllegalArgumentException("Missing accuracy query parameter for MinMaxCache method");
        }
        float accuracy = Float.parseFloat(visualQuery.getParams().get("accuracy"));

        Query minMaxCacheQuery = new Query(from, to, measures, accuracy, width, height, filter);    
        // Delegate to minMaxCache
        QueryResults minMaxCacheQueryResults =  minMaxCache.executeQuery(minMaxCacheQuery);

        VisualQueryResults visualQueryResults = new VisualQueryResults();
        visualQueryResults.setData(minMaxCacheQueryResults.getData());
        visualQueryResults.setTimeRange(minMaxCacheQueryResults.getTimeRange());
        visualQueryResults.setQueryTime(minMaxCacheQueryResults.getQueryTime());
        visualQueryResults.setIoCount(minMaxCacheQueryResults.getIoCount());
        
        Map<String, String> metrics = new HashMap<>();
        metrics.put("error", minMaxCacheQueryResults.getError().toString());
        visualQueryResults.setMetrics(metrics);
        return visualQueryResults;
    }

    public void initializeInitParameters(Map<String, String> params){
        if (params.containsKey("prefetchingFactor")) {
            prefetchingFactor = Float.parseFloat(params.get("prefetchingFactor"));
        } else {
            throw new IllegalArgumentException("Missing prefetchingFactor parameter for MinMaxCache method");
        }

        if (params.containsKey("dataReductionRatio")) {
            dataReductionRatio = Integer.parseInt(params.get("dataReductionRatio"));
        } else {
            throw new IllegalArgumentException("Missing dataReductionRatio parameter for MinMaxCache method");
        }

        if (params.containsKey("aggFactor")) {
            aggFactor = Integer.parseInt(params.get("aggFactor"));
        } else {
            throw new IllegalArgumentException("Missing aggFactor parameter for MinMaxCache method");
        }
    }

    public boolean isInitialized(String datasetId) {
        return cacheMap.containsKey(datasetId);
    }
}
