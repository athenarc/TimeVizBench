import { BarChart } from '@mui/x-charts/BarChart';
import { COLORS } from 'interfaces/util';
import { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  series: any[],
}


const ResponseTimes = ({series}: ProgressBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <BarChart
        layout={'vertical'}
        dataset={series}
        series={[
          { dataKey: 'query', stack: 'time', label: 'Query', color: COLORS[0] }, // Green
          { dataKey: 'rendering', stack: 'time', label: 'Rendering', color:  COLORS[1] }, // Blue
          { dataKey: 'networking', stack: 'time', label: 'Networking', color: COLORS[2] }, // Orange
        ]}
        xAxis={[{ scaleType: 'band', dataKey: 'dataset' }]}
        yAxis={[{ label: 'time (ms)' }]}
        skipAnimation
        resolveSizeBeforeRender
        margin={{ top: 45}} 
        slots={{
          noDataOverlay: ()=>(<></>)
        }}
        slotProps={{
          legend: {
            direction: 'row',
            position: { vertical: 'top', horizontal: 'left' },
            padding: 0,
            itemMarkWidth: 10,
            itemMarkHeight: 10,
            labelStyle: {
              fontSize: 14,
            },
          },
        }}
      />
    </div>
  );
}

export default ResponseTimes;
