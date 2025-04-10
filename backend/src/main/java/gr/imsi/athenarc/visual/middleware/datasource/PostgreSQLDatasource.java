package gr.imsi.athenarc.visual.middleware.datasource;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.AbstractDataset;
import gr.imsi.athenarc.visual.middleware.datasource.dataset.PostgreSQLDataset;
import gr.imsi.athenarc.visual.middleware.datasource.executor.SQLQueryExecutor;
import gr.imsi.athenarc.visual.middleware.datasource.iterator.m4.PostgreSQLM4DataPointsIterator;
import gr.imsi.athenarc.visual.middleware.datasource.iterator.minmax.PostgreSQLMinMaxDataPointsIterator;
import gr.imsi.athenarc.visual.middleware.datasource.iterator.raw.PostgreSQLDataPointsIterator;
import gr.imsi.athenarc.visual.middleware.datasource.query.QueryMethod;
import gr.imsi.athenarc.visual.middleware.datasource.query.SQLQuery;
import gr.imsi.athenarc.visual.middleware.domain.*;

import org.jetbrains.annotations.NotNull;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

public class PostgreSQLDatasource implements DataSource {

    SQLQueryExecutor sqlQueryExecutor;
    PostgreSQLDataset dataset;

    public PostgreSQLDatasource(SQLQueryExecutor sqlQueryExecutor, PostgreSQLDataset dataset) {
        this.dataset = dataset;
        this.sqlQueryExecutor = sqlQueryExecutor;
    }

    @Override
    public AggregatedDataPoints getMinMaxDataPoints(long from, long to,
                                                        Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure, Map<Integer, Integer> numberOfGroups) {
        return new SQLAggregatedDataPoints(from, to, missingIntervalsPerMeasure, numberOfGroups, QueryMethod.MIN_MAX);
    }

    @Override
    public AggregatedDataPoints getM4DataPoints(long from, long to,
                                                        Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure, Map<Integer, Integer> numberOfGroups) {
        return new SQLAggregatedDataPoints(from, to, missingIntervalsPerMeasure, numberOfGroups, QueryMethod.M4);
    }
    @Override
    public DataPoints getDataPoints(long from, long to, List<Integer> measures) {
        Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure = new HashMap<>();
        for (Integer measure : measures) {
            List<TimeInterval> timeIntervalsForMeasure = new ArrayList<>();
            timeIntervalsForMeasure.add(new TimeRange(from, to));
            missingIntervalsPerMeasure.put(measure, timeIntervalsForMeasure);
        }
        return new PostgreSQLDatasource.SQLDataPoints(from, to, missingIntervalsPerMeasure);
    }

    @Override
    public DataPoints getDataPoints(long from, long to, Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure) {
        return null;
    }

    @Override
    public DataPoints getAllDataPoints(List<Integer> measures) {
        Map<Integer, List<TimeInterval>> missingTimeIntervalsPerMeasure = new HashMap<>(measures.size());
        for (Integer measure : measures) {
            List<TimeInterval> timeIntervalsForMeasure = new ArrayList<>();
            timeIntervalsForMeasure.add(new TimeRange(dataset.getTimeRange().getFrom(), dataset.getTimeRange().getTo()));
            missingTimeIntervalsPerMeasure.put(measure, timeIntervalsForMeasure);
        }
        return new PostgreSQLDatasource.SQLDataPoints(dataset.getTimeRange().getFrom(),
                dataset.getTimeRange().getTo(), missingTimeIntervalsPerMeasure);
    }

    /**
     * Represents a series of {@link SQLDataPoints} instances.
     * The iterator returned from this class accesses the SQL database to request the data points.
     */

    public class SQLDataPoints implements DataPoints {

        private final SQLQuery sqlQuery;

        public SQLDataPoints(long from, long to, Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure) {
            Map<String, List<TimeInterval>> missingIntervalsPerMeasureName = missingIntervalsPerMeasure.entrySet().stream()
                    .collect(Collectors.toMap(
                            entry -> dataset.getHeader()[entry.getKey()], // Key mapping is the measure name
                            Map.Entry::getValue // Value remains the same
                    ));
            this.sqlQuery = new SQLQuery(dataset.getSchema(), dataset.getTableName(), dataset.getTimeFormat(), dataset.getTimeCol(), dataset.getIdCol(), dataset.getValueCol(),
                    from, to, missingIntervalsPerMeasureName);
        }

        @NotNull
        public Iterator<DataPoint> iterator() {
            try {
                ResultSet resultSet = sqlQueryExecutor.executeRawSqlQuery(sqlQuery);
                return new PostgreSQLDataPointsIterator(new ArrayList<>(), resultSet);
            }
            catch(SQLException e) {
                e.printStackTrace();
            }
            return Collections.emptyIterator();
        }

        @Override
        public long getFrom() {
            return sqlQuery.getFrom();
        }

        @Override
        public long getTo() {
            return sqlQuery.getFrom();
        }
        @Override
        public String getFromDate() {
            return getFromDate("yyyy-MM-dd HH:mm:ss");
        }

        @Override
        public String getToDate() {
            return getToDate("yyyy-MM-dd HH:mm:ss");
        }

        @Override
        public String getFromDate(String format) {
            return Instant.ofEpochMilli(sqlQuery.getFrom()).atZone(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern(format));
        }

        @Override
        public String getToDate(String format) {
            return Instant.ofEpochMilli(sqlQuery.getFrom()).atZone(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern(format));
        }

    }

    final class SQLAggregatedDataPoints implements AggregatedDataPoints {

        private final SQLQuery sqlQuery;
        private final QueryMethod queryMethod;
        private final Map<String, Integer> measuresMap;


        public SQLAggregatedDataPoints(long from, long to, Map<Integer, List<TimeInterval>> missingIntervalsPerMeasure, Map<Integer, Integer> numberOfGroups, QueryMethod queryMethod) {
            Map<String, List<TimeInterval>> missingIntervalsPerMeasureName = missingIntervalsPerMeasure.entrySet().stream()
                    .collect(Collectors.toMap(
                            entry -> dataset.getHeader()[entry.getKey()], // Key mapping is the measure name
                            Map.Entry::getValue, // Value remains the same
                            (v1, v2) -> v1, // Merge function to keep the first value in case of key collision
                            LinkedHashMap::new // Specify LinkedHashMap to maintain insertion order
                    ));
            Map<String, Integer> numberOfGroupsPerMeasureName = numberOfGroups.entrySet().stream()
                    .collect(Collectors.toMap(
                            entry -> dataset.getHeader()[entry.getKey()], // Key mapping is the measure name
                            Map.Entry::getValue, // Value remains the same
                            (v1, v2) -> v1, // Merge function to keep the first value in case of key collision
                            LinkedHashMap::new // Specify LinkedHashMap to maintain insertion order
                    ));
            this.measuresMap = missingIntervalsPerMeasure.entrySet().stream()
                    .collect(Collectors.toMap(
                            entry -> dataset.getHeader()[entry.getKey()], // Key mapping is the measure name
                            Map.Entry::getKey, // Value is the key of the measure
                            (v1, v2) -> v1, // Merge function to keep the first value in case of key collision
                            LinkedHashMap::new // Specify LinkedHashMap to maintain insertion order
                    ));
            this.sqlQuery = new SQLQuery(dataset.getSchema(), dataset.getTableName(),  dataset.getTimeFormat(), dataset.getTimeCol(), dataset.getIdCol(), dataset.getValueCol(),
                    from, to, missingIntervalsPerMeasureName, numberOfGroupsPerMeasureName);
            this.queryMethod = queryMethod;
        }

        @NotNull
        public Iterator<AggregatedDataPoint> iterator() {
            try {
                if (queryMethod == QueryMethod.M4) {
                    ResultSet resultSet = sqlQueryExecutor.executeM4SqlQuery(sqlQuery);
                    return new PostgreSQLM4DataPointsIterator(resultSet, sqlQuery.getMissingIntervalsPerMeasure(), sqlQuery.getAggregateIntervals(), measuresMap);
                } else {
                    ResultSet resultSet = sqlQueryExecutor.executeMinMaxSqlQuery(sqlQuery);
                    return new PostgreSQLMinMaxDataPointsIterator(resultSet, sqlQuery.getMissingIntervalsPerMeasure(), sqlQuery.getAggregateIntervals(), measuresMap);
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
            return Collections.emptyIterator();
        }

        @Override
        public String toString() {
            return "PostgreSQLDataPoints{" +
                    "measures=" + sqlQuery.getMissingIntervalsPerMeasure().keySet() +
                    ", from=" + sqlQuery.getFrom() +
                    ", to=" + sqlQuery.getTo() +
                    '}';
        }

        @Override
        public long getFrom() {
            return sqlQuery.getFrom();
        }

        @Override
        public long getTo() {
            return sqlQuery.getTo();
        }

        @Override
        public String getFromDate() {
            return getFromDate(dataset.getTimeFormat());
        }

        @Override
        public String getToDate() {
            return getToDate(dataset.getTimeFormat());
        }

        @Override
        public String getFromDate(String format) {
            return Instant.ofEpochMilli(sqlQuery.getFrom()).atZone(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern(format));
        }

        @Override
        public String getToDate(String format) {
            return Instant.ofEpochMilli(sqlQuery.getFrom()).atZone(ZoneId.of("UTC")).format(DateTimeFormatter.ofPattern(format));
        }
    }

    public Map<Integer, List<DataPoint>> execute(String dbQuery){
        try {
            ResultSet resultSet = sqlQueryExecutor.executeDbQuery(dbQuery);
            return collect(resultSet);
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public AbstractDataset getDataset(){
        return dataset;
    }
    
    public void closeConnection() {
        sqlQueryExecutor.closeConnection();
    }

    private Map<Integer, List<DataPoint>> collect(ResultSet resultSet) throws SQLException {
        HashMap<Integer, List<DataPoint>> data = new HashMap<>();
        while(resultSet.next()){
            Integer measure = Arrays.asList(dataset.getHeader()).indexOf(resultSet.getString(1)); // measure
            long epoch = resultSet.getLong(2); // min_timestamp
            long epoch2 = resultSet.getLong(3); // max_timestamp
            Double val = resultSet.getObject(4) == null ? null : resultSet.getDouble(4); // value
            if(val == null) continue;
            data.computeIfAbsent(measure, m -> new ArrayList<>()).add(
                    new ImmutableDataPoint(epoch, val, measure));
            data.computeIfAbsent(measure, m -> new ArrayList<>()).add(
                    new ImmutableDataPoint(epoch2, val, measure));
        }
        data.forEach((k, v) -> v.sort(Comparator.comparingLong(DataPoint::getTimestamp)));
        return data;
    }
}
