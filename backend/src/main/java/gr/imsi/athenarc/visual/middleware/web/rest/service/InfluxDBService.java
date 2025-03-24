package gr.imsi.athenarc.visual.middleware.web.rest.service;

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

    private DataSource dataSource;

    private String timeFormat = "yyyy-MM-dd[ HH:mm:ss]";

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
        dataSource = DataSourceFactory.createDataSource(dataSourceConfiguration);
    }

    // Method to perform a query with cancellation support
    public VisualQueryResults performQuery(VisualQuery visualQuery) {
        String schema = visualQuery.getSchema();
        String id = visualQuery.getTable();

        if (dataSource == null) {
            initializeDataSource(schema, id);
        }
   
        // Perform the query asynchronously
        Method method = MethodManager.getOrInitializeMethod(
            visualQuery.getMethodConfig().getKey(),
            dataSource,
            visualQuery.getMethodConfig().getParams()
        );

        return method.executeQuery(visualQuery);
    }

    // Close connection method (optional)
    public void closeConnection() {
        if (dataSource != null) {
            dataSource.closeConnection();
            LOG.info("InfluxDB connection closed.");
        }
    }

    public InfluxDBDataset getDatasetById(String schema, String id) {
        if(dataSource == null) {
            initializeDataSource(schema, id);
        }
        return (InfluxDBDataset) dataSource.getDataset();
    }

    public void clearCache() {
        // InfluxDB doesn't have a direct cache clearing mechanism
        // We can force a query cache refresh by executing:
        dataSource.closeConnection();
        // Reconnect with fresh client
    }

}

