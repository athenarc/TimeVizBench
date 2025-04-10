package gr.imsi.athenarc.visual.middleware.methods.cache;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import gr.imsi.athenarc.visual.middleware.datasource.DataSource;
import gr.imsi.athenarc.visual.middleware.domain.IntervalTree;
import gr.imsi.athenarc.visual.middleware.methods.cache.query.Query;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

public class CacheManager {

    private final List<Integer> measures;
    private static final Logger LOG = LoggerFactory.getLogger(MinMaxCache.class);
    private final DataSource dataSource;
    private final Map<Integer, IntervalTree<TimeSeriesSpan>> intervalTrees;

    protected CacheManager(DataSource dataSource) {
        this.dataSource = dataSource;
        this.measures = dataSource.getDataset().getMeasures();
        this.intervalTrees = new HashMap<>();
        measures.forEach(m -> intervalTrees.put(m, new IntervalTree<>()));
    }

    protected void addToCache(List<TimeSeriesSpan> timeSeriesSpans) {
        timeSeriesSpans.forEach(timeSeriesSpan -> getIntervalTree(timeSeriesSpan.getMeasure()).insert(timeSeriesSpan));
    }

    protected Map<Integer, List<TimeSeriesSpan>> getFromCache(Query query, long pixelColumnInterval) {
        // For each query measure, get the corresponding interval tree. From it retrieve the overlapping spans.
        return query.getMeasures().stream().collect(Collectors.toMap(
                // Key: Measure
                m -> m,
                // Value: List of TimeSeriesSpan
                m -> StreamSupport.stream(
                                Spliterators.spliteratorUnknownSize(getIntervalTree(m).overlappers(query), 0), false)
                        // Keep only spans with an aggregate interval that is half or less than the pixel column interval to ensure at least one fully contained in every pixel column that the span fully overlaps
                        // This way, each of the groups of the resulting spans will overlap at most two pixel columns.
                        .filter(span -> pixelColumnInterval >= 2 * span.getAggregateInterval())
                        .collect(Collectors.toList())
        ));
    }

    protected IntervalTree<TimeSeriesSpan> getIntervalTree(int measure) {
        return intervalTrees.get(measures.indexOf(measure));
    }
}
