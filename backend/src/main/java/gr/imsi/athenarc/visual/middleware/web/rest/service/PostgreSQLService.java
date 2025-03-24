package gr.imsi.athenarc.visual.middleware.web.rest.service;

import java.sql.SQLException;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import gr.imsi.athenarc.visual.middleware.cache.MinMaxCache;
import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.datasource.DataSourceFactory;
import gr.imsi.athenarc.visual.middleware.datasource.PostgreSQLDatasource;
import gr.imsi.athenarc.visual.middleware.datasource.config.PostgreSQLConfiguration;
import gr.imsi.athenarc.visual.middleware.datasource.connection.JDBCConnection;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.PostgreSQLDataset;
import gr.imsi.athenarc.visual.middleware.methods.VisualQuery;
import gr.imsi.athenarc.visual.middleware.methods.VisualQueryResults;

@Service
public class PostgreSQLService {

    private static final Logger LOG = LoggerFactory.getLogger(PostgreSQLService.class);

    @Value("${postgres.url}")
    private String postgresUrl;

    @Value("${postgres.username}")
    private String postgresUsername;

    @Value("${postgres.password}")
    private String postgresPassword;

    private String timeFormat = "yyyy-MM-dd[ HH:mm:ss]";

    private DataSource dataSource;


    // Map to hold the minmaxcache of each dataset
    private final ConcurrentHashMap<String, MinMaxCache> cacheMap = new ConcurrentHashMap<>();

    @Autowired
    public PostgreSQLService() {}


    // Method to initialize datasource manually
    public void initializeDatasource(String schema, String table) throws SQLException {
        PostgreSQLConfiguration dataSourceConfiguration = new PostgreSQLConfiguration.Builder()
                    .url(postgresUrl)
                    .username(postgresUsername)
                    .password(postgresPassword)
                    .schema(schema)
                    .timeFormat(timeFormat)
                    .table(table)
                    .build();  
        dataSource = DataSourceFactory.createDataSource(dataSourceConfiguration);
        LOG.info("PostgreSQL connection established.");
    }

    public VisualQueryResults performQuery(VisualQuery visualQuery) throws SQLException {
        String schema = visualQuery.getSchema();
        String id = visualQuery.getTable();
        if (dataSource == null) {
            initializeDatasource(schema, id);
        }

        return null;
    }

    // Close connection method (optional)
    public void closeConnection() throws SQLException {
        dataSource.closeConnection();
    }
  
    public PostgreSQLDataset getDatasetById(String schema, String id) throws SQLException {
        if (dataSource == null) {
            initializeDatasource(schema, id);
        }
        return (PostgreSQLDataset) dataSource.getDataset();
    }

    public void clearCache() {
        // try (Connection conn = dataSource.getConnection();
        //      Statement stmt = conn.createStatement()) {
        //     // DISCARD ALL is the most thorough way to clear PostgreSQL's cache
        //     stmt.execute("DISCARD ALL");
        // } catch (SQLException e) {
        //     throw new RuntimeException("Failed to clear PostgreSQL cache", e);
        // }
    }
}
