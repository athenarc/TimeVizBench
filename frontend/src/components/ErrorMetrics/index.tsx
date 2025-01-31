import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import { COLORS } from 'interfaces/util';
import { useEffect, useRef, useState } from 'react';

interface ErrorMetricsProps {
  // Update the series type to accept any properties
  series: { measure: string; [key: string]: any }[];
  selectedMetric: {label: string, id: string};
  selectedMethodInstances: string[];
  formatInstanceId: (instanceId: string) => string; // Add this prop
}


const ErrorMetrics = ({ 
  series, 
  selectedMetric, 
  selectedMethodInstances,
  formatInstanceId 
}: ErrorMetricsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 130 });

  useEffect(() => { 
    setDimensions({ width: dimensions.width, height: 60 * series.length + 70 });
  },[series]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 60 * series.length + 70,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [series]);

  const legendItems = selectedMethodInstances.map((instanceId, index) => {
    return {
      dataKey: `${instanceId}_${selectedMetric.id}`,
      label: formatInstanceId(instanceId),
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed height legend */}
      <div style={{ overflow: 'auto', padding: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {legendItems.map((item, index) => (
            <div key={item.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, backgroundColor: item.color }} />
              <Typography variant="subtitle2">{item.label}</Typography>
            </div>
          ))}
        </div>
      </div>
      
      {/* Scrollable chart area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <BarChart
          layout={'horizontal'}
          dataset={series}
          series={legendItems}
          yAxis={[{ scaleType: 'band', dataKey: 'measure' }]}
          xAxis={[{ label: selectedMetric.label }]}
          width={dimensions.width}
          height={dimensions.height}
          skipAnimation
          margin={{ top: 0, left: 100, right: 50, bottom: 50 }}
          slots={{
            noDataOverlay: () => null,
            legend: () => null // Disable default legend since we have our custom one
          }}
        />
      </div>
    </div>
  );
};

export default ErrorMetrics;