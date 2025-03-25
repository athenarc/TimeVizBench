package gr.imsi.athenarc.visual.middleware.web.rest.service;

import java.sql.SQLException;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.datasource.DataSourceFactory;
import gr.imsi.athenarc.visual.middleware.datasource.PostgreSQLDatasource;
import gr.imsi.athenarc.visual.middleware.datasource.config.PostgreSQLConfiguration;
import gr.imsi.athenarc.visual.middleware.datasource.connection.JDBCConnection;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.PostgreSQLDataset;
import gr.imsi.athenarc.visual.middleware.methods.VisualQuery;
import gr.imsi.athenarc.visual.middleware.methods.VisualQueryResults;
import gr.imsi.athenarc.visual.middleware.methods.cache.MinMaxCache;

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

    private final ConcurrentHashMap<String, DataSource> dataSources = new ConcurrentHashMap<>();

    @Autowired
    public PostgreSQLService() {}


    // Method to initialize datasource manually
    public void initializeDataSource(String schema, String table) throws SQLException {
        PostgreSQLConfiguration dataSourceConfiguration = new PostgreSQLConfiguration.Builder()
                    .url(postgresUrl)
                    .username(postgresUsername)
                    .password(postgresPassword)
                    .schema(schema)
                    .timeFormat(timeFormat)
                    .table(table)
                    .build();  
        dataSources.put(table, DataSourceFactory.createDataSource(dataSourceConfiguration));
    }

    public VisualQueryResults performQuery(VisualQuery visualQuery) throws SQLException {
        String schema = visualQuery.getSchema();
        String id = visualQuery.getTable();
        if (dataSources.get(id) == null) {
            initializeDataSource(schema, id);
        }

        return null;
    }
  
    public PostgreSQLDataset getDatasetById(String schema, String id) throws SQLException {
        if (dataSources.get(id) == null) {
            initializeDataSource(schema, id);
        }
        return (PostgreSQLDataset) dataSources.get(id).getDataset();
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
