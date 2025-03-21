import { BarChart } from '@mui/x-charts/BarChart';
import { COLORS } from 'interfaces/util';
import { useRef } from 'react';

interface DataAccessProps {
  series: any[],
}


const DataAccess = ({series}: DataAccessProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <BarChart
        layout={'vertical'}
        dataset={series}
        series={[{
          dataKey: 'ioCount',
          label: 'Datapoints',
          color: COLORS[0]
        }]}
        xAxis={[{ scaleType: 'band', dataKey: 'dataset' }]}
        yAxis={[{ label: 'datapoints' }]}
        skipAnimation
        resolveSizeBeforeRender
        margin={{ top: 45}} // Further increase left margin to avoid cutting off y-axis labels
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
