import { BarChart } from '@mui/x-charts/BarChart';
import { COLORS } from 'interfaces/util';
import { useEffect, useRef, useState } from 'react';

interface DataAccessProps {
  series: any[],
}


const DataAccess = ({series}: DataAccessProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 105 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 105
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <BarChart
        layout={'horizontal'}
        dataset={series}
        series={[{
          dataKey: 'ioCount',
          label: 'Datapoints',
          color: COLORS[0]
        }]}
        yAxis={[{ scaleType: 'band', dataKey: 'dataset' }]}
        xAxis={[{ label: 'datapoints' }]}
        width={dimensions.width}
        height={dimensions.height}
        skipAnimation
        resolveSizeBeforeRender
        margin={{ top: 0, left: 100 }} // Further increase left margin to avoid cutting off y-axis labels
        slots={{
          noDataOverlay: ()=>(<></>)
        }}
        slotProps={{
          legend: {
            hidden: true
          },
        }}
      />
    </div>
  );
}

export default DataAccess;
