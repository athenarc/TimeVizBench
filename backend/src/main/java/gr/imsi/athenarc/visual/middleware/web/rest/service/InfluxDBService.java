package gr.imsi.athenarc.visual.middleware.web.rest.service;

import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import gr.imsi.athenarc.visual.middleware.methods.Method;
import gr.imsi.athenarc.visual.middleware.methods.MethodManager;
import gr.imsi.athenarc.visual.middleware.methods.VisualQuery;
import gr.imsi.athenarc.visual.middleware.methods.VisualQueryResults;
import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.datasource.DataSourceFactory;
import gr.imsi.athenarc.visual.middleware.datasource.config.InfluxDBConfiguration;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.InfluxDBDataset;

@Service
public class InfluxDBService {

    private static final Logger LOG = LoggerFactory.getLogger(InfluxDBService.class);

    @Value("${influxdb.url}")
    private String influxDbUrl;

    @Value("${influxdb.token}")
    private String influxDbToken;

    @Value("${influxdb.org}")
    private String influxDbOrg;

    @Value("${influxdb.bucket}")
    private String influxDbBucket;

    private String timeFormat = "yyyy-MM-dd[ HH:mm:ss]";

    private final ConcurrentHashMap<String, DataSource> dataSources = new ConcurrentHashMap<>();

    @Autowired
    public InfluxDBService() {
    }

    // Method to initialize InfluxDB connection manually
    public void initializeDataSource(String schema, String table) {
        InfluxDBConfiguration  dataSourceConfiguration = new InfluxDBConfiguration.Builder()
        .url(influxDbUrl)
        .org(influxDbOrg)
        .token(influxDbToken)
        .bucket(schema)
        .timeFormat(timeFormat)
        .measurement(table)
        .build();  
        LOG.info("InfluxDB connection established.");
        dataSources.put(table, DataSourceFactory.createDataSource(dataSourceConfiguration));
    }

    // Method to perform a query with cancellation support
    public VisualQueryResults performQuery(VisualQuery visualQuery) {
        String schema = visualQuery.getSchema();
        String id = visualQuery.getTable();

        if (!dataSources.containsKey(id)) {
            initializeDataSource(schema, id);
        }
   
        // Perform the query asynchronously
        Method method = MethodManager.getOrInitializeMethod(
            visualQuery.getMethodConfig().getKey(),
            dataSources.get(id),
            visualQuery.getMethodConfig().getParams()
        );

        return method.executeQuery(dataSources.get(id), visualQuery);
    }

    public InfluxDBDataset getDatasetById(String schema, String id) {
        if(!dataSources.containsKey(id)) {
            initializeDataSource(schema, id);
        }
        return (InfluxDBDataset) dataSources.get(id).getDataset();
    }

    public void clearCache() {
        // InfluxDB doesn't have a direct cache clearing mechanism
        // We can force a query cache refresh by executing:
        dataSources.values().forEach(dataSource -> {
            dataSource.closeConnection();
        });
        dataSources.clear();
    }

}

