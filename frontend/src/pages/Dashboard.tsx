import {MouseEvent, useEffect, useState, useRef} from 'react';
import * as d3 from 'd3';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select, {SelectChangeEvent} from '@mui/material/Select';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import apiService from 'api/apiService';
import axios from 'axios';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import AppBar from '@mui/material/AppBar';
import {DateTimePicker} from '@mui/x-date-pickers/DateTimePicker';
import dayjs, {Dayjs} from 'dayjs';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import CardContent from '@mui/material/CardContent';
import {useDebouncedCallback} from 'use-debounce';
import Toolbar from '@mui/material/Toolbar';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DownloadIcon from '@mui/icons-material/Download';
import { useDispatch, useSelector } from 'react-redux';
import { addQuery, updateRenderingTimes } from '../store/queryHistorySlice';
import { RootState } from '../store/store';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TableViewIcon from '@mui/icons-material/TableView';
import BarChartIcon from '@mui/icons-material/BarChart';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { Resizable } from 're-resizable';

import {Measure, Metadata, metadataDtoToDomain} from '../interfaces/metadata';
import {QueryResultsDto, TimeSeriesPoint} from '../interfaces/data';
import {Query, queryToQueryDto} from '../interfaces/query';
import ResponseTimes from "components/ResponseTimes";
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DataAccess from 'components/DataAccess';
import { useMethodConfigurations } from '../components/MethodSettings';
import { compare } from '../utils/ssim';
import React from 'react';

// Constants for the layout
const DEFAULT_CHART_PADDING = 5;
const DRAWER_WIDTH = 420;
const MIN_LOG_HEIGHT = "20%"; // Reduced minimum height
const MAX_LOG_HEIGHT = "80%"; // Reduced maximum height
const DEFAULT_LOG_HEIGHT = window.innerHeight * 0.3; // 30% of the window height
const PADDING_BETWEEN_SECTIONS = 8; // Padding between main sections

const Dashboard = () => {
  const dispatch = useDispatch();
  const queryHistory = useSelector((state: RootState) => state.queryHistory.queries);
  const REFERENCE_METHOD = 'M4';
  
  // Add state for reference data
  const [referenceResults, setReferenceResults] = useState<Record<number, QueryResultsDto>>({});
  const [isReferenceFetching, setIsReferenceFetching] = useState<boolean>(false);

  // Add state for visualization controls
  const [magnifierEnabled, setMagnifierEnabled] = useState<boolean>(false);
  const [showQualityMetrics, setShowQualityMetrics] = useState<boolean>(false);
  const [ssimValues, setSSIMValues] = useState<Record<string, Record<number, number>>>({});
  const [isCalculatingSSIM, setIsCalculatingSSIM] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);

  const [from, setFrom] = useState<Date>(dayjs(1330144930991).toDate());
  const [to, setTo] = useState<Date>(dayjs(1330244930991).toDate());

  // default width, height will be reset once page is loaded
  const [height, setHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  
  const [minDate, setMinDate] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);

  const [measures, setMeasures] = useState<Measure[]>([]);

  const [datasource, setDatasource] = useState<string>('influx');
  const [schema, setSchema] = useState<string>('more');
  const [table, setTable] = useState<string>('manufacturing_exp');

  const [metadata, setMetadata] = useState<Metadata>();

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [initParams, setInitParams] = useState<Record<string, any>>({});

  const [methodInstances, setMethodInstances] = useState<
    Record<string, { id: string; method: string, initParams: Record<string, any> }[]>
  >({});

  const [isAddingMethod, setIsAddingMethod] = useState<boolean>(false);

  const [queryParams, setQueryParams] = useState<Record<string, Record<string, Record<string, any>>>>({});

  // multiple results by method
  const [queryResults, setQueryResults] = useState<Record<string, QueryResultsDto | undefined>>({});

  const [selectedChart, setSelectedChart] = useState<number | null>(null);

  // multiple response times by algoirthm
  const [responseTimes, setResponseTimes] = useState<Record<string, { total: number; rendering: number }>>({});

  // a dictionary of AbortControllers keyed by method
  const abortControllersRef = useRef<{ [algo: string]: AbortController | null }>({});

  // Add reference abort controller
  const referenceAbortController = useRef<AbortController | null>(null);

  const [currentOperationId, setCurrentOperationId] = useState<string>('');

  const margin = {top: 20, right: 0, bottom: 20, left: 40};

  const clearMeasures = () => {
    setMeasures([]);
    setQueryResults({});
    setResponseTimes({});
  };

  const existingInitializationParameters = (method: string): boolean => {
    return Boolean(
      methodInstances[selectedMethod].find(
        (inst) => JSON.stringify(inst.initParams) === JSON.stringify(initParams)
      )
    );
  }

  const existingQueryParams = (): boolean => {
    return selectedMethodInstances.some((instanceId) => {
      const [method] = instanceId.split('-');
      return hasQueryParameters(method);
    });
  };


  const hasConfigParameters = (method: string): boolean => {  
    return methodConfigurations[method]?.initParams && Object.keys(methodConfigurations[method]?.initParams).length > 0;
  }
  
  const hasQueryParameters = (method: string): boolean => {  
    return methodConfigurations[method]?.queryParams && Object.keys(methodConfigurations[method]?.queryParams).length > 0;
  }
  
  const getTickFormat = () => {
    return d3.timeFormat('%Y-%m-%d %H:%M:%S');
  };

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const response = await apiService.getMetadata(datasource, schema, table);

      const metadata = metadataDtoToDomain(response.data);
      setMetadata(metadata);
      setMinDate(dayjs(metadata.timeRange.from).toDate());
      setMaxDate(dayjs(metadata.timeRange.to).toDate());
      setFrom(dayjs(metadata.timeRange.from).toDate());
      setTo(dayjs(metadata.timeRange.from).add(1, 'm').toDate());
    } catch (error) {
      console.error(error);
      if (axios.isCancel(error)) {
        console.log('Request canceled:', error.message);
        return null;
      } else {
        throw error; // Re-throw other errors
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (instanceId: string, from: Date, to: Date, metadata: Metadata, operationId: string = currentOperationId) => {
    let fromQuery = from.getTime();
    if (fromQuery < metadata.timeRange.from) {
      fromQuery = metadata.timeRange.from;
      setFrom(dayjs(metadata.timeRange.from).toDate());
    }

    let toQuery = to.getTime();
    if (toQuery > metadata.timeRange.to) {
      toQuery = metadata.timeRange.to;
      setTo(dayjs(metadata.timeRange.to).toDate());
    }

    if (abortControllersRef.current[instanceId]) {
      abortControllersRef.current[instanceId]!.abort();
    }
    const controller = new AbortController();
    abortControllersRef.current[instanceId] = controller;

    setLoading(true);
    setLoadingCharts((prev) => ({ ...prev, [instanceId]: true }));

    const chartWidth = Math.floor(d3.select('#chart-content').node().getBoundingClientRect().width);
    setWidth(chartWidth);
    let chartHeight = height;

    const instance = Object.values(methodInstances).flat().find((inst) => inst.id === instanceId);
    const initParams = instance?.initParams || {};

    const request: Query = {
      query: {
        methodConfig: {
          key: instanceId,
          params: initParams,
        },
        from: dayjs(fromQuery).toDate(),
        to: dayjs(toQuery).toDate(),
        measures: measures.map(({id}) => id),
        width: chartWidth - margin.left - margin.right,
        height: Math.floor(chartHeight / measures.length / selectedMethodInstances.length - margin.bottom - margin.top),
        schema: schema,
        table: table,
        params: queryParams[instanceId] || {},
      },
    };

    let startTime = performance.now();
    try {
      const queryResults = await apiService.getData(
        datasource,
        queryToQueryDto(request),
        controller.signal
      );

      if (!queryResults) {
        return;
      }
      
      let endTime = performance.now();
      let queryTime = endTime - startTime;
      
      setQueryResults((prev) => ({
        ...prev,
        [instanceId]: queryResults,
      }));

      // Store only query-related performance metrics
      setResponseTimes((prev) => ({
        ...prev,
        [instanceId]: {
          total: queryTime,
          rendering: 0, // This will be updated in the useEffect
        },
      }));

      // Store the query and server-side performance metrics in Redux
      dispatch(addQuery({ 
        query: queryToQueryDto(request), 
        instanceId,
        results: queryResults,
        performance: {
          total: queryTime,
          rendering: 0, // This will be updated in the useEffect
          query: (queryResults.queryTime || 0) * 1000,
          networking: queryTime - ((queryResults.queryTime || 0) * 1000),
          ioCount: queryResults.ioCount || 0
        },
        operationId // Add the operation ID to group queries
      }));

    } catch (error) {
      console.error(error);
      if (axios.isCancel(error)) {
        console.log('Request canceled:', error.message);
        return null;
      } else {
        throw error; // Re-throw other errors
      }
    } finally {
      setLoadingCharts((prev) => ({ ...prev, [instanceId]: false }));
      setLoading(false);
    }
  };

  const handleSelectMeasures = (event: SelectChangeEvent<string[]>) => {
    const {
      target: {value},
    } = event;

    const selectedMeasures = typeof value === 'string' ? value.split(',') : value;

    const selectedObjects = metadata?.measures.filter((measure) =>
      selectedMeasures.includes(measure.name)
    );

    setMeasures(selectedObjects ?? []);
  };

  const handleTableChange = (event: MouseEvent<HTMLElement>, table: string) => {
    setTable(table);
    clearMeasures();
  };

  const { methodConfigurations, loading: methodConfigLoading, error: methodConfigError } = useMethodConfigurations();

  // Update handleMethodSelect to wait for configurations
  const handleMethodSelect = (event: SelectChangeEvent<string>) => {
    const method = event.target.value;
    setSelectedMethod(method);
    if (methodConfigurations[method]?.initParams) {
      const initializedParams = Object.keys(methodConfigurations[method].initParams).reduce((acc, key) => {
        acc[key] = methodConfigurations[method].initParams[key].default;
        return acc;
      }, {} as Record<string, any>);
      setInitParams(initializedParams);
    } else {
      setInitParams({});
    }
  };

  const handleParamChange = (paramKey: string, value: any) => {
    const paramConfig = methodConfigurations[selectedMethod]?.initParams[paramKey];
    if (paramConfig?.type === "number") {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue) && parsedValue >= (paramConfig.min ?? -Infinity) && parsedValue <= (paramConfig.max ?? Infinity)) {
        setInitParams((prevParams) => ({
          ...prevParams,
          [paramKey]: parsedValue,
        }));
      }
    } else {
      setInitParams((prevParams) => ({
        ...prevParams,
        [paramKey]: value,
      }));
    }
  };

  const handleCancelAddMethod = () => {
    setSelectedMethod('');
    setInitParams({});
    setIsAddingMethod(false);
  };

  const handleAddInstance = () => {
    if (!selectedMethod) return;

    const id = `${selectedMethod}-${Date.now()}`;
    const newInstance = { id, method: selectedMethod, initParams };

    const alreadyExists = methodInstances[selectedMethod] && existingInitializationParameters(selectedMethod);

    if (alreadyExists) {
      alert('Instance already exists');
      return;
    }
    setMethodInstances((prevInstances) => ({
      ...prevInstances,
      [selectedMethod]: [
        ...(prevInstances[selectedMethod] || []),
        newInstance,
      ],
    }));

    // Initialize query parameters with default values
    const defaultQueryParams = methodConfigurations[selectedMethod]?.queryParams || {};
    const initializedQueryParams = Object.keys(defaultQueryParams).reduce((acc, key) => {
      acc[key] = defaultQueryParams[key].default;
      return acc;
    }, {} as Record<string, any>);
    setQueryParams((prevParams) => ({
      ...prevParams,
      [id]: initializedQueryParams,
    }));

    // Add the new instance to the selected method instances
    setSelectedMethodInstances((prevSelected) => [...prevSelected, id]);

    // Reset form
    setSelectedMethod('');
    setInitParams({});
    setIsAddingMethod(false);
  };

  const handleQueryParamChange = (instanceId: string, paramKey: string, value: any) => {
    setQueryParams((prevParams) => ({
      ...prevParams,
      [instanceId]: {
        ...prevParams[instanceId],
        [paramKey]: value,
      },
    }));
  };

  const debouncedFetchAll = useDebouncedCallback(
    async (algos: string[], from, to, metadata) => {
      // Generate new operation ID for each pan/zoom operation
      const newOperationId = Date.now().toString();
      setCurrentOperationId(newOperationId);
      
      // Loop over each method in sequence
      for (const algo of algos) {
        await fetchData(algo, from, to, metadata, newOperationId);
      }
    },
    300
  );


  // Function to render the magnified chart content
  const renderMagnifiedContent = () => {
    if (!magnifierContent || !magnifierVisible) return null;
    
    const { instanceId, measureIndex } = magnifierContent;
    
    // Get the SVG selector
    const svgSelector = `#svg_${instanceId}_${measureIndex}`;

    
    const svgElement = document.querySelector(svgSelector);
    if (!svgElement) return null;
    
    const svgRect = svgElement.getBoundingClientRect();
    
    // Calculate mouse position relative to the SVG
    const relativeX = magnifierPosition.x - svgRect.left;
    const relativeY = magnifierPosition.y - svgRect.top;
    
    // Create a clipping group that will show only part of the chart
    return (
      <svg width={MAGNIFIER_SIZE} height={MAGNIFIER_SIZE} viewBox={`0 0 ${MAGNIFIER_SIZE} ${MAGNIFIER_SIZE}`}>
        <defs>
          <clipPath id="magnifierClip">
            <circle cx={MAGNIFIER_SIZE/2} cy={MAGNIFIER_SIZE/2} r={MAGNIFIER_SIZE/2 - 1} />
          </clipPath>
        </defs>
        
        {/* Use a group with the clip path and translation for proper centering */}
        <g clipPath="url(#magnifierClip)">
          {/* Create a translated and scaled clone of the SVG content */}
          <g 
            transform={`translate(${MAGNIFIER_SIZE/2 - relativeX * ZOOM_FACTOR}, ${MAGNIFIER_SIZE/2 - relativeY * ZOOM_FACTOR}) scale(${ZOOM_FACTOR})`}
            dangerouslySetInnerHTML={{ 
              __html: svgElement.innerHTML 
            }}
          />
        </g>
        
        {/* Add crosshair in the center */}
        <line 
          x1={MAGNIFIER_SIZE/2} 
          y1="0" 
          x2={MAGNIFIER_SIZE/2} 
          y2={MAGNIFIER_SIZE} 
          stroke="red" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
        <line 
          x1="0" 
          y1={MAGNIFIER_SIZE/2} 
          x2={MAGNIFIER_SIZE} 
          y2={MAGNIFIER_SIZE/2} 
          stroke="red" 
          strokeWidth="1" 
          strokeDasharray="2,2"
        />
      </svg>
    );
  };

  // New function to calculate SSIM values for all charts
  const calculateAllSSIMValues = async (refResults: Record<number, QueryResultsDto> = referenceResults) => {
    if (Object.keys(refResults).length === 0) {
      console.log("No reference results available");
      return;
    }

    setIsCalculatingSSIM(true);
    
    try {
      const newSSIMValues: Record<string, Record<number, number>> = {};
      
      // For each method instance
      for (const instanceId of selectedMethodInstances) {
        // Skip the reference method itself
        if (instanceId === `${REFERENCE_METHOD}-reference`) continue;
        
        newSSIMValues[instanceId] = {};
        const methodResults = queryResults[instanceId];
        
        if (!methodResults) continue;
        
        // For each measure
        measures.forEach((measure, index) => {
          const referenceResult = refResults[measure.id];
          
          if (methodResults && referenceResult) {
            const ssimValue = calculateSSIM(
              methodResults.data[measure.id],
              referenceResult.data[measure.id],
              width,
              height / measures.length,
              instanceId
            );
            console.log(ssimValue);
            newSSIMValues[instanceId][index] = ssimValue;
          }
        });
      }
      
      setSSIMValues(newSSIMValues);
    } finally {
      setIsCalculatingSSIM(false);
    }
  };

  // Function to toggle SSIM calculation
  const handleToggleQualityMetrics = () => {
    const newValue = !showQualityMetrics;
    setShowQualityMetrics(newValue);
    
    if (newValue && Object.keys(referenceResults).length === 0) {
      // If enabling and we don't have reference data yet, fetch it
      fetchReferenceData();
    }
  };

  // New function to toggle magnifier overlay on existing charts
  const toggleMagnifierOverlay = (enabled: boolean) => {
    // For all SVGs with the chart-svg class
    d3.selectAll('.chart-svg').each(function(this: SVGSVGElement) {
      const svg = d3.select(this);
      const svgNode = svg.node() as SVGSVGElement;
      if (!svgNode) return;
      // Get selector to extract chart metadata
      const id = svgNode.id;
      if (!id) return;
  
      const selectorParts = id.split('_');
      if (selectorParts.length < 3) return;
      
      const instanceId = selectorParts[1];
      const measureIndexStr = selectorParts[2].split('-')[0];
      const measureIndex = parseInt(measureIndexStr);
      
      // Remove any existing magnifier overlay
      svg.selectAll('.magnifier-overlay').remove();
  
      // Add new overlay if enabled
      if (enabled) {
        svg.append('rect')
          .attr('class', 'magnifier-overlay')
          .attr('width', svgNode.width.baseVal.value)
          .attr('height', svgNode.height.baseVal.value)
          .attr('fill', 'transparent')
          .on('mousemove', function(event:any) {
            setMagnifierPosition({x: event.pageX, y: event.pageY});
            setMagnifierContent({
              instanceId,
              measureIndex
            });
            setMagnifierVisible(true);
          })
          .on('mouseleave', function() {
            setMagnifierVisible(false);
          });
      }
    });
  };

  useEffect(()=> {
    if (showQualityMetrics) {
      fetchReferenceData();
    }
    else {
      setReferenceResults({});
      setSSIMValues({});
    }
  },[showQualityMetrics])


  const [selectedMethodInstances, setSelectedMethodInstances] = useState<string[]>([]);
  const [loadingCharts, setLoadingCharts] = useState<Record<string, boolean>>({});

  const formatInstanceId = (instanceId: string) => {
    const [method, timestamp] = instanceId.split('-');
  
    if (!hasConfigParameters(method)) {
      return method;
    }
  
    const instances = methodInstances[method] || [];
    if (instances.length === 1) {
      return method;
    }
  
    const instanceNumber = instances.findIndex(inst => inst.id === instanceId) + 1;
    return `${method}-${instanceNumber}`;
  };

  const handleMethodInstanceChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    const newSelected = typeof value === 'string' ? value.split(',') : value;
    setSelectedMethodInstances(newSelected);
    
    // Clear results for deselected instances
    setQueryResults(prev => {
      const newResults = {...prev};
      Object.keys(newResults).forEach(key => {
        if (!newSelected.includes(key)) {
          delete newResults[key];
        }
      });
      return newResults;
    });
    
    setResponseTimes(prev => {
      const newTimes = {...prev};
      Object.keys(newTimes).forEach(key => {
        if (!newSelected.includes(key)) {
          delete newTimes[key];
        }
      });
      return newTimes;
    });
  };

  // reset zoom
  useEffect(() => {
    if (!measures.length) return;
    for (const algo of selectedMethodInstances) {
      const res = queryResults[algo];
      if (!res) continue;
      const series = Object.values(res.data);
      series.forEach((_, index) => {
        const svg = d3.select(`#svg_${algo}_${index}`);
        svg.call(d3.zoom().transform, d3.zoomIdentity);
      });
    }
  }, [queryResults, measures, selectedMethodInstances]);
  
  // render ref data
  useEffect(() => {
    // Loop over each measure and for each selected method instance
    if (!showQualityMetrics || Object.keys(referenceResults).length === 0) {
      return; // Exit early if quality metrics are disabled or no reference data
    }
    
    measures.forEach((measure, measureIndex) => {
      selectedMethodInstances.forEach(instanceId => {
        // Skip the m4 reference instance itself
        if (instanceId === `${REFERENCE_METHOD}-reference`) return;
  
        // Select the corresponding SVG element
        const svg = d3.select(`#svg_${instanceId}_${measureIndex}`);
        
        if (svg.empty()) {
          console.error(`SVG not found for instance ${instanceId} and measure index ${measureIndex}`);
          return;
        }
        
        // Remove any existing m4 overlay from this SVG
        svg.selectAll('.m4-overlay').remove();

        // Get measure ID and corresponding reference data
        const measureId = measure.id;
        const m4Data = referenceResults[measureId]?.data[measureId];
        const timeRange = referenceResults[measureId]?.timeRange;
        
        if (!m4Data || !timeRange) {
          console.log(`No reference data found for measure ${measureId}`);
          return;
        }
        
        const minTs = new Date(timeRange.from);
        const maxTs = new Date(timeRange.to);

        const chartWidth = width - (DEFAULT_CHART_PADDING * 2);
        const chartHeight = Math.floor(height / measures.length / selectedMethodInstances.length);

        // Compute x scale using the common time range
        const x = d3
          .scaleTime()
          .domain([minTs, maxTs])
          .range([margin.left + 1, Math.floor(chartWidth - margin.right)]);
  
        // Compute y scale based on the m4 data
        const formattedM4 = m4Data.map(d => [new Date(d.timestamp), d.value]);
        const m4Min = d3.min(formattedM4, (d:any) => d[1]);
        const m4Max = d3.max(formattedM4, (d:any) => d[1]);

        const y = d3
          .scaleLinear()
          .domain([m4Min, m4Max])
          .range([chartHeight - margin.bottom - 1, margin.top]);
  
        // Create a line generator for the m4 overlay
        const line = d3
          .line()
          .x((d:any) => Math.floor(x(new Date(d.timestamp))) + 1 / window.devicePixelRatio)
          .y((d:any) => Math.floor(y(d.value)) + 1 / window.devicePixelRatio)
          .curve(d3.curveLinear);
        
        console.log(`Adding reference overlay for ${instanceId}, measure ${measureId}, data points: ${m4Data.length}`);
        
        // Append the m4 overlay path with increased visibility
        svg.append('path')
          .attr('class', 'm4-overlay')
          .datum(m4Data)
          .attr('fill', 'none')
          .attr('stroke', 'green')  
          .attr('stroke-width', 1 / window.devicePixelRatio)
          .style('shape-rendering', 'crispEdges')
          .attr('stroke-opacity', 0.6)  
          .attr('d', line);

        // Add debug information to the console
        if (svg.select('.m4-overlay').empty()) {
          console.error('Failed to add reference line to SVG');
        } else {
          console.log('Reference line added successfully');
        }

        // Also update SSIM calculation if we have both reference data and method data
        if (queryResults[instanceId] && queryResults[instanceId]?.data[measureId]) {
          calculateAllSSIMValues();
        }
      });
    });
  }, [referenceResults, width, height, measures, selectedMethodInstances]);
  

  useEffect(() => {
    // Add SSIM label if quality metrics are enabled
    measures.forEach((measure, measureIndex) => {
      selectedMethodInstances.forEach(instanceId => {
        // Skip the m4 reference instance itself
        if (instanceId === `${REFERENCE_METHOD}-reference`) return;
  
        // Select the corresponding SVG element
        const svg = d3.select(`#svg_${instanceId}_${measureIndex}`);
        
        if (svg.empty()) {
          console.error(`SVG not found for instance ${instanceId} and measure index ${measureIndex}`);
          return;
        }
        
        // Remove any existing m4 overlay from this SVG
        svg.selectAll('.metrics-info-bg').remove();
        svg.selectAll('.reference-legend').remove();
        svg.selectAll('.reference-legend-text').remove();
        svg.selectAll(".ssim-value").remove();
  
        if (showQualityMetrics) {
          const hasSSIMValue = ssimValues[instanceId] && ssimValues[instanceId][measureIndex] !== undefined;
          const hasReferenceData = Object.keys(referenceResults).length > 0;
          
          if (hasSSIMValue || hasReferenceData) {
            // Create a background for metrics info
            svg.append('rect')
              .attr('class', 'metrics-info-bg')
              .attr('x', width - 135)
              .attr('y', 5)
              .attr('width', 130)
              .attr('height', hasSSIMValue && hasReferenceData ? 40 : 20)
              .attr('rx', 4)
              .attr('fill', 'rgba(255, 255, 255, 0.85)')
              .attr('stroke', 'rgba(0, 0, 0, 0.1)')
              .attr('stroke-width', 1);
            
            // Add the reference data indicator
            if (hasReferenceData) {
              svg.append('line')
                .attr('class', 'reference-legend')
                .attr('x1', width - 130)
                .attr('y1', 15)
                .attr('x2', width - 105)
                .attr('y2', 15)
                .attr('stroke', 'green')  // Match the color of the reference line
                .attr('stroke-width', 2);

              svg.append('text')
                .attr('class', 'reference-legend-text')
                .attr('x', width - 100)
                .attr('y', 19)
                .attr('text-anchor', 'start')
                .attr('font-size', '12px')
                .attr('fill', '#333')
                .text('Reference');
            }
            
            // Add the SSIM value if available
            if (hasSSIMValue) {
              const ssimValue = ssimValues[instanceId][measureIndex];
              const yOffset = hasReferenceData ? 35 : 19;
              
              svg.append('text')
                .attr('class', 'ssim-value')
                .attr('x', width - 130)
                .attr('y', yOffset)
                .attr('text-anchor', 'start')
                .attr('font-size', '12px')
                .attr('fill', ssimValue > 0.8 ? 'green' : ssimValue > 0.6 ? 'orange' : 'red')
                .text(`SSIM: ${ssimValue.toFixed(3)}`);
            }
          }
        }
      });
    });
  },[ssimValues]);

  const fetchReferenceData = async () => {
    if (!metadata || !from || !to || !measures.length) {
      console.log("Cannot fetch reference data: missing metadata, time range or measures");
      return null;
    }
    
    if (referenceAbortController.current) {
      referenceAbortController.current.abort();
    }
    const controller = new AbortController();
    referenceAbortController.current = controller;
    
    setIsReferenceFetching(true);
    try {
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = Math.floor(height / measures.length / selectedMethodInstances.length - margin.bottom - margin.top);

      // Use the M4 instance ID for reference data
      const m4InstanceId = `${REFERENCE_METHOD}-reference`;

      const request: Query = {
        query: {
          methodConfig: {
            key: m4InstanceId,
            params: {},
          },
          from: from,
          to: to,
          measures: measures.map(m => m.id),
          width: chartWidth,
          height: chartHeight,
          schema: schema,
          table: table,
          params: {},
        },
      };

      console.log("Fetching reference data:", request);
      const response = await apiService.getData(
        datasource,
        queryToQueryDto(request),
        controller.signal
      );

      if (response) {
        console.log("Reference data received:", response);
        const newReferenceResults = measures.reduce((acc, measure, index) => {
          acc[measure.id] = response;
          return acc;
        }, {} as Record<number, QueryResultsDto>);
        
        setReferenceResults(newReferenceResults);
        console.log("Reference results set:", newReferenceResults);
      }

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Reference data fetch cancelled');
      } else {
        console.error('Error fetching reference data:', error);
      }
    } finally {
      setIsReferenceFetching(false);
    }
  };

  // Modify effect to ensure quality metrics toggle correctly handles reference data
  useEffect(() => {
    if (showQualityMetrics) {
      console.log("Quality metrics enabled, fetching reference data");
      fetchReferenceData();
    } else {
      console.log("Quality metrics disabled, clearing reference data");
      setReferenceResults({});
      setSSIMValues({});
      // Also remove any existing reference overlays
      d3.selectAll('.m4-overlay').remove();
    }
  }, [showQualityMetrics]);


  const renderChart = (
    selector: string,
    data: { timestamp: number; value: number }[],
    width: number,
    height: number,
    timeRange: { from: number; to: number }
  ) => {
    const svg = d3.select(selector);
    svg.selectAll('*').remove(); // Clear previous render
  
    const chartPlane = svg.append('g');
  
    // Extract the instanceId and measureIndex from the selector
    const selectorParts = selector.split('_');
    const instanceId = selectorParts[1];
    const measureIndexStr = selectorParts[2].split('-')[0];
    const measureIndex = parseInt(measureIndexStr);
  
    // Convert x to Date from timestamp
    const formattedData = data.map((d: any) => [new Date(d.timestamp), d.value] as [Date, number]);
  
    // Set up scales
    const minTs = new Date(timeRange.from);
    const maxTs = new Date(timeRange.to);
  
    // Start from a pixel right of the axis
    // End at the right edge
    const x = d3
      .scaleTime()
      .domain([minTs, maxTs])
      .range([margin.left + 1, Math.floor(width - margin.right)]); // Floor the width to avoid blurry lines
  
    // Start from a pixel right of the axis
    // End at the right edge
    const minValue = d3.min(formattedData, (d: any) => d[1]);
    const maxValue = d3.max(formattedData, (d: any) => d[1]);
  
    // Start a pixel above the bottom axis
    // End at the top edge
    const y = d3
      .scaleLinear()
      .domain([minValue, maxValue])
      .range([Math.floor(height - margin.bottom) - 1, margin.top]); // Floor the height to avoid blurry lines
  
    // Function to add X gridlines
    const makeXGridlines = () => d3.axisBottom(x);
  
    // Function to add Y gridlines
    const makeYGridlines = () =>
      d3
        .axisLeft(y)
        .ticks(7)
        .tickValues([...y.ticks(7), y.domain()[1]]);
  
    // Add X gridlines
    chartPlane
      .append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(
        makeXGridlines()
          .tickSize(-height + margin.top + margin.bottom) // Extend lines down to the bottom
          .tickFormat(() => '') // No tick labels
      );
  
    // Add Y gridlines
    chartPlane
      .append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(
        makeYGridlines()
          .tickSize(-width + margin.left + margin.right) // Extend lines across the width
          .tickFormat(() => '') // No tick labels
      );
  
    // Apply basic styles for the gridlines
    svg
      .selectAll('.grid line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7)
      .style('shape-rendering', 'crispEdges');
  
    svg.selectAll('.grid path').style('stroke-width', 0);
  
    // X Axis
    chartPlane
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(7).tickFormat(d3.timeFormat(getTickFormat())));
  
    // Y Axis
    chartPlane
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(y).ticks(7));
  
    // Add path
    const line = d3
      .line()
      .x((d: any) => Math.floor(x(d[0])) + 1 / window.devicePixelRatio)
      .y((d: any) => Math.floor(y(d[1])) + 1 / window.devicePixelRatio)
      .curve(d3.curveLinear);
  
    const path = chartPlane
      .append('path')
      .attr('class', 'path')
      .datum(formattedData)
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 1 / window.devicePixelRatio)
      .style('shape-rendering', 'crispEdges')
      .attr('d', line);

  
    const zoom = d3
      .zoom()
      .on('zoom', (event: any) => {
        const newX = event.transform.rescaleX(x);
        path.attr(
          'd',
          d3
            .line()
            .x((d: any) => Math.floor(newX(d[0])))
            .y((d: any) => Math.floor(y(d[1])))
            .curve(d3.curveLinear)
        );
  
        svg.selectAll('.point').remove();
  
      })
      .on('end', (event: any) => {
        const newX = event.transform.rescaleX(x);
        let [start, end] = newX.domain().map((d: any) => dayjs(d.getTime()).toDate());
  
        setFrom(start);
        setTo(end);
      });
  
    svg.call(zoom);
  
    // Add magnifier class to the SVG for identification
    svg.classed('chart-svg', true);
  
    // Return chart data for potential later use
    return {
      svg,
      width,
      height,
      instanceId,
      measureIndex
    };
  };

  // render chart
  useEffect(() => {
    if (!measures.length || !queryResults) return;

    // Track rendering time for Redux updates
    let renderingTimesByInstance: Record<string, number> = {};

    for (const algo of selectedMethodInstances) {
      const res = queryResults[algo];
      if (!res) continue; // skip if not fetched yet

      const series = Object.values(res.data);
      const timeRange = res.timeRange;
      let totalRenderTime = 0;

      // For each measure index, we have series[index]
      series.forEach((data, index) => {
        const renderStartTime = performance.now();
        
        renderChart(
          `#svg_${algo}_${index}`,
          data,
          width - (DEFAULT_CHART_PADDING * 2), // minus 10 pixels for padding = 5px
          Math.floor(height / measures.length / selectedMethodInstances.length),
          {from: timeRange.from, to: timeRange.to}
        );
        
        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime;
        totalRenderTime += renderTime;
      });

      renderingTimesByInstance[algo] = totalRenderTime;

      // Update response times with rendering time
      setResponseTimes((prev) => ({
        ...prev,
        [algo]: {
          ...prev[algo],
          rendering: totalRenderTime,
        },
      }));
    }

    // Apply magnifier overlays if enabled
    if (magnifierEnabled) {
      toggleMagnifierOverlay(true);
    }

    // Update Redux store with rendering times
    if (Object.keys(renderingTimesByInstance).length > 0 && currentOperationId) {
      dispatch(updateRenderingTimes({
        operationId: currentOperationId,
        renderingTimes: renderingTimesByInstance
      }));
    }

    if(showQualityMetrics){
      fetchReferenceData();
    }

  }, [
    queryResults,
    selectedMethodInstances,
    metadata,
    width,
    height,
  ]);


  useEffect(() =>{
    toggleMagnifierOverlay(magnifierEnabled);
  }, [magnifierEnabled])


  // add resize handler for charts
  useEffect(() => {
    d3.select(window).on('resize', function () {
      if (d3.select('#chart-content').node()) {
        setWidth(Math.floor(d3.select('#chart-content').node().getBoundingClientRect().width));
      }
    });
  }, []);

  // fetch metadata
  useEffect(() => {
    fetchMetadata();
  }, [table, datasource, schema]);

  // fetch data
  useEffect(() => {
    if (!metadata || !from || !to || !measures.length) {
      return;
    }
    // Generate a new operation ID for time range changes
    const newOperationId = Date.now().toString();
    setCurrentOperationId(newOperationId);
    debouncedFetchAll(selectedMethodInstances, from, to, metadata);
  }, [
    from,
    to,
    selectedMethodInstances,
    metadata,
    measures,
    height,
    width,
    schema,
    table,
    selectedChart,
  ]);

  const calculateSSIM = (methodData: any[], referenceData: any[], width: number, height: number, instanceId: string) => {

    // Convert time series data to SVG path
    const createPathData = (data: any[]) => {
      const xScale = d3.scaleTime()
        .domain(d3.extent(data, (d:TimeSeriesPoint) => new Date(d.timestamp)) as [Date, Date])
        .range([margin.left, width - margin.right]);
  
      const yScale = d3.scaleLinear()
        .domain(d3.extent(data, (d:TimeSeriesPoint) => d.value) as [number, number])
        .range([height - margin.bottom, margin.top]);
  
      const line = d3.line()
        .x((d:TimeSeriesPoint) => xScale(new Date(d.timestamp)))
        .y((d:TimeSeriesPoint) => yScale(d.value));
  
      return line(data) || '';
    };
  
    // Generate SVG path data for both series
    const methodPathData = createPathData(methodData);
    const referencePathData = createPathData(referenceData);
  
    // Calculate effective width and height (subtract margins)
    const effectiveWidth = width - margin.left - margin.right;
    const effectiveHeight = height - margin.top - margin.bottom;
  
    // Compare the two paths using SSIM
    const result = compare(methodPathData, referencePathData, effectiveWidth, effectiveHeight);
  
    return result.ssim;
  };

  // Reset reference results when measures change
  useEffect(() => {
    setReferenceResults({});
  }, [measures]);

  // Add cleanup for reference abort controller
  useEffect(() => {
    return () => {
      if (referenceAbortController.current) {
        referenceAbortController.current.abort();
      }
    };
  }, []);

  // Initialize M4 method instance on component mount
  useEffect(() => {
    const m4Instance = {
      id: `${REFERENCE_METHOD}-reference`,
      method: REFERENCE_METHOD,
      initParams: {}
    };

    setMethodInstances(prev => ({
      ...prev,
      [REFERENCE_METHOD]: [m4Instance]
    }));

    // Add M4 to selected instances by default
    setSelectedMethodInstances([m4Instance.id]);
  }, []);
  
  const handleExportResults = () => {
    if (queryHistory.length === 0) {
      alert('No queries to export');
      return;
    }

    const escapeCSVField = (field: any): string => {
      if (typeof field === 'object') {
        // Wrap JSON strings in quotes and escape internal quotes
        return `"${JSON.stringify(field).replace(/"/g, '""')}"`;
      }
      if (typeof field === 'string' && field.includes(',')) {
        // Wrap strings containing commas in quotes and escape internal quotes
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field.toString();
    };

    // Convert queries to CSV format
    const headers = [
      'Operation ID',
      'Operation Timestamp',
      'Instance ID',
      'Method',
      'From',
      'To',
      'Width',
      'Height',
      'Schema',
      'Dataset',
      'Measures',
      'Init Params',
      'Query Params',
      'Total Time (ms)',
      'Query Time (ms)',
      'Rendering Time (ms)',
      'Networking Time (ms)',
      'IO Count'
    ].join(',');

    const rows = queryHistory.map((entry : any) => {
      const { operationId, timestamp, instanceId, query, performance } = entry;
      const methodConfig = query.query.methodConfig;
      const fields = [
        operationId || 'unknown',
        new Date(timestamp).toISOString(),
        formatInstanceId(instanceId),
        methodConfig.key,
        new Date(query.query.from).toISOString(),
        new Date(query.query.to).toISOString(),
        query.query.width,
        query.query.height,
        query.query.schema,
        query.query.table,
        escapeCSVField(query.query.measures),
        escapeCSVField(methodConfig.params),
        escapeCSVField(query.query.params),
        performance?.total || '',
        performance?.query || '',
        performance?.rendering || '',
        performance?.networking || '',
        performance?.ioCount || ''
      ];
      return fields.join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `query_history_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add state for magnifying lens
  const [magnifierVisible, setMagnifierVisible] = useState<boolean>(false);
  const [magnifierPosition, setMagnifierPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [magnifierContent, setMagnifierContent] = useState<{
    instanceId: string,
    measureIndex: number,
  } | null>(null);
  const magnifierRef = useRef<HTMLDivElement>(null);
  
  // Constants for magnifier
  const MAGNIFIER_SIZE = 120;
  const ZOOM_FACTOR = 3;

  // New state variables for layout control
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [logViewMode, setLogViewMode] = useState<'table' | 'chart'>('table'); 
  const [logViewTimeframe, setLogViewTimeframe] = useState<'latest' | 'recent' | 'all'>('latest');
  const [logHeight, setLogHeight] = useState<number>(DEFAULT_LOG_HEIGHT);

  // monitor window resize
  useEffect(() => {
    // Use setTimeout to allow the DOM to update first
    setTimeout(() => {
      const chartContentNode = d3.select('#chart-content').node();
      if (chartContentNode) {
        setWidth(Math.floor(chartContentNode.getBoundingClientRect().width));
      }
    }, 250);
  }, [sidebarOpen])

  useEffect(() => {
    const chartContentElement = document.getElementById('chart-content');
    if (chartContentElement) {
      const chartContentHeight = 
        chartContentElement.getBoundingClientRect().height 
        - 4 * PADDING_BETWEEN_SECTIONS 
        - (selectedMethodInstances.length * 8 * DEFAULT_CHART_PADDING)
        - (measures.length * 8 * DEFAULT_CHART_PADDING);
      setHeight(chartContentHeight);
    }
  }, [logHeight, selectedMethodInstances, measures]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'table' | 'chart' | null) => {
    if (newMode !== null) {
      setLogViewMode(newMode);
    }
  };

  const handleLogTimeframeChange = (event: React.MouseEvent<HTMLElement>, newTimeframe: 'latest' | 'recent' | 'all' | null) => {
    if (newTimeframe !== null) {
      setLogViewTimeframe(newTimeframe);
    }
  };

  // Get a filtered view of query history based on the selected timeframe
  const getFilteredQueryHistory = () => {
    if (!queryHistory.length) return [];
    
    // Group queries by operationId
    const groupedQueries = queryHistory.reduce((acc, query) => {
      const operationId = query.operationId || 'unknown';
      if (!acc[operationId]) {
        acc[operationId] = [];
      }
      acc[operationId].push(query);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Convert to array of operation groups
    const operationGroups = Object.entries(groupedQueries).map(([operationId, queries]) => ({
      operationId,
      timestamp: queries[0].timestamp, // Use timestamp of first query in group
      queries
    }));
    
    // Sort by timestamp (newest first)
    const sortedGroups = operationGroups.sort((a, b) => b.timestamp - a.timestamp);
    
    if (logViewTimeframe === 'latest') {
      return sortedGroups.slice(0, 1); // Latest operation group
    } else if (logViewTimeframe === 'recent') {
      return sortedGroups.slice(0, 5); // Recent 5 operation groups
    } else {
      return sortedGroups; // All operation groups
    }
  };

  // Add state to track expanded rows
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Toggle row expansion
  const handleRowExpand = (operationId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [operationId]: !prev[operationId]
    }));
  };

  // Render table view of logs
  const renderLogsTable = () => {
    const filteredHistory = getFilteredQueryHistory();
    
    if (!filteredHistory.length) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1" color="text.secondary">No query history available</Typography>
        </Box>
      );
    }
    
    return (
      <TableContainer component={Paper} sx={{ height: '100%', overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="40px"></TableCell>
              <TableCell>Operation Time</TableCell>
              <TableCell>Time Range</TableCell>
              <TableCell>Measures</TableCell>
              <TableCell>Methods</TableCell>
              <TableCell>Total Queries</TableCell>
              <TableCell>Total Time (ms)</TableCell>
              <TableCell>Total IO Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHistory.map((group, index) => {
              const { operationId, timestamp, queries } = group;
              const isExpanded = Boolean(expandedRows[operationId]) || (index === 0);
              
              // Use the first query to get time range and measures
              const firstQuery = queries[0];
              const fromDate = new Date(firstQuery.query.query.from);
              const toDate = new Date(firstQuery.query.query.to);
              const measures = firstQuery.query.query.measures.join(', ');
              
              // Get unique method names
              const methodNames = Array.from(new Set(queries.map(q => formatInstanceId(q.instanceId)))).join(', ');
              
              // Calculate aggregated metrics
              const totalTime = queries.reduce((sum, q) => sum + (q.performance?.total || 0), 0);
              const totalIOCount = queries.reduce((sum, q) => sum + (q.performance?.ioCount || 0), 0);
              
              // Group queries by method instance
              const methodGroups = queries.reduce((acc, query) => {
                const methodId = query.instanceId;
                const formattedId = formatInstanceId(methodId);
                
                if (!acc[formattedId]) {
                  acc[formattedId] = {
                    instanceId: methodId,
                    displayName: formattedId,
                    total: 0,
                    query: 0,
                    rendering: 0,
                    networking: 0,
                    ioCount: 0
                  };
                }
                
                acc[formattedId].total += query.performance?.total || 0;
                acc[formattedId].query += query.performance?.query || 0;
                acc[formattedId].rendering += query.performance?.rendering || 0;
                acc[formattedId].networking += query.performance?.networking || 0;
                acc[formattedId].ioCount += query.performance?.ioCount || 0;
                
                return acc;
              }, {} as Record<string, any>);

              return (
                <React.Fragment key={operationId}>
                  {/* Main row with aggregated data */}
                  <TableRow 
                    hover 
                    onClick={() => index !== 0 && handleRowExpand(operationId)}
                    sx={{ 
                      cursor: 'pointer',
                      '& > *': { borderBottom: isExpanded ? 'unset' : 'inherit' },
                      backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                    }}
                  >
                    <TableCell>
                      {/* Render the IconButton only for rows other than the first */}
                      {index === 0 && (
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          disabled={true}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                      {index !== 0 && (
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowExpand(operationId);
                          }}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>{new Date(timestamp).toLocaleString()}</TableCell>
                    <TableCell>{`${fromDate.toLocaleDateString()} ${fromDate.toLocaleTimeString()} - ${toDate.toLocaleDateString()} ${toDate.toLocaleTimeString()}`}</TableCell>
                    <TableCell>{measures}</TableCell>
                    <TableCell>{methodNames}</TableCell>
                    <TableCell>{queries.length}</TableCell>
                    <TableCell>{totalTime.toFixed(2)}</TableCell>
                    <TableCell>{totalIOCount}</TableCell>
                  </TableRow>
                  
                  {/* Expandable detail rows for each method */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          {/* <Typography variant="subtitle2" gutterBottom component="div">
                            Method Details
                          </Typography> */}
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Method</TableCell>
                                <TableCell>Total Time (ms)</TableCell>
                                <TableCell>Query Time (ms)</TableCell>
                                <TableCell>Rendering Time (ms)</TableCell>
                                <TableCell>Networking Time (ms)</TableCell>
                                <TableCell>IO Count</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Object.values(methodGroups).map((method:any) => (
                                <TableRow key={method.instanceId}>
                                  <TableCell component="th" scope="row">{method.displayName}</TableCell>
                                  <TableCell>{method.total.toFixed(2)}</TableCell>
                                  <TableCell>{method.query.toFixed(2)}</TableCell>
                                  <TableCell>{method.rendering.toFixed(2)}</TableCell>
                                  <TableCell>{method.networking.toFixed(2)}</TableCell>
                                  <TableCell>{method.ioCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const qualityMeasuresDisabled = () => {
    return selectedMethodInstances.length === 0 || 
           (selectedMethodInstances.length === 1 && 
            selectedMethodInstances[0] === `${REFERENCE_METHOD}-reference`);
  }
  
  // Render chart view of logs
  const renderLogsCharts = () => {
    const filteredHistory = getFilteredQueryHistory();
    
    if (!filteredHistory.length) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="body1" color="text.secondary">No query history available</Typography>
        </Box>
      );
    }
    
    // Prepare chart data aggregated by operation groups
    const chartData = filteredHistory.map(group => {
      const { operationId, timestamp, queries } = group;
      
      // Group by method instance within each operation
      const methodData = queries.reduce((acc, query) => {
        const instanceId = query.instanceId;
        const formattedId = formatInstanceId(instanceId);
        
        if (!acc[formattedId]) {
          acc[formattedId] = {
            dataset: formattedId,
            networking: 0,
            query: 0,
            rendering: 0,
            ioCount: 0
          };
        }
        
        acc[formattedId].networking += query.performance?.networking || 0;
        acc[formattedId].query += query.performance?.query || 0;
        acc[formattedId].rendering += query.performance?.rendering || 0;
        acc[formattedId].ioCount += query.performance?.ioCount || 0;
        
        return acc;
      }, {} as Record<string, any>);
      
      return {
        operationId,
        timestamp,
        methods: Object.values(methodData)
      };
    });
    
    return (
      <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
        <Grid container spacing={2}>
          {chartData.map((operation, index) => (
            <Grid key={operation.operationId} container spacing={2} sx={{ mb: 2 }}>
              <Grid size={12}>
                <Typography variant="subtitle2">
                  Operation at {new Date(operation.timestamp).toLocaleString()}
                </Typography>
              </Grid>
              
              {/* Performance Chart */}
              <Grid size={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Time Breakdown (ms)
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponseTimes series={operation.methods} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Data Access Chart */}
              <Grid size={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Data Access (IO Count)
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <DataAccess series={operation.methods} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      mt:'48px', 
      overflow: 'hidden', 
      p: 2, 
      height: 'calc(100vh - 48px - 16px)', // Full height minus AppBar and padding
      boxSizing: 'border-box'
    }}>
      {/* AppBar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar variant="dense">
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            edge="start"
            sx={{ mr: 2 }}
          >
            {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TimeVizBench
          </Typography>
         
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: DRAWER_WIDTH,
            height: '100%',  // Set to full available height
            pr: 2,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Card 
            variant="outlined" 
            sx={{ 
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%', // Make sure the card takes full height
            }}
          >
            <Box sx={{ p: 1, flexGrow: 1, overflow: 'auto' }}>
              {/* Control Panel Content */}
              <Grid container spacing={1}>
                <Grid size={12}>
                  <Typography variant="overline">Time Range</Typography>
                  <Grid container spacing={2} sx={{ pb: 1 }} alignItems={'center'}>
                    <Grid size={12}>
                      <DateTimePicker
                        label="From"
                        minDateTime={dayjs(minDate)}
                        maxDateTime={dayjs(to)}
                        disabled={loading}
                        value={dayjs(from)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        onAccept={(newValue: Dayjs | null) => {
                          if (newValue) {
                            setFrom(newValue.toDate());
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={12}>
                      <DateTimePicker
                        label="To"
                        minDateTime={dayjs(from)}
                        maxDateTime={dayjs(maxDate)}
                        disabled={loading}
                        value={dayjs(to)}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        onAccept={(newValue: Dayjs | null) => {
                          if (newValue) {
                            setTo(newValue.toDate());
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={12}>
                  <Typography variant="overline">Dataset</Typography>
                  <List component="nav" aria-label="table">
                    <ListItemButton
                      dense
                      disabled={loading}
                      selected={table === 'intel_lab_exp'}
                      onClick={(event) => handleTableChange(event, 'intel_lab_exp')}
                    >
                      <ListItemText primary="intel_lab_exp" />
                    </ListItemButton>
                    <ListItemButton
                      dense
                      disabled={loading}
                      selected={table === 'manufacturing_exp'}
                      onClick={(event) => handleTableChange(event, 'manufacturing_exp')}
                    >
                      <ListItemText primary="manufacturing_exp" />
                    </ListItemButton>
                  </List>
                </Grid>
                <Grid size={12}>
                  <Typography variant="overline">Method Instances</Typography>
                  <Box display="flex" alignItems="center">
                    <Select
                      multiple
                      fullWidth
                      size="small"
                      value={selectedMethodInstances}
                      onChange={handleMethodInstanceChange}
                      renderValue={(selected) => (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {(selected as string[]).map((value) => {
                            return (
                              <Chip
                                key={value}
                                label={formatInstanceId(value)}
                                style={{ margin: 2 }}
                              />
                            );
                          })}
                        </Box>
                      )}
                      disabled={Object.values(methodInstances).flat().length === 0}
                      MenuProps={{
                        PaperProps: {
                          style: {
                            maxHeight: 48 * 4.5 + 8,
                            width: 250,
                          },
                        },
                      }}
                    >
                      {Object.values(methodInstances).flat().map((instance) => (
                        <MenuItem key={instance.id} value={instance.id}>
                          <Box display="flex" flexDirection="column">
                            <Typography variant="body2">{formatInstanceId(instance.id)}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {Object.entries(instance.initParams).map(([key, value]) => (
                                <span key={key}>{`${key}: ${value},`}</span>
                              ))}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => setIsAddingMethod(!isAddingMethod)}
                    >
                      {isAddingMethod ? <RemoveIcon /> : <AddIcon />}
                    </IconButton>
                  </Box>
                  {isAddingMethod && (
                    <Box mt={2}>
                      <Typography variant="subtitle2">Method</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selectedMethod}
                        onChange={handleMethodSelect}
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          Select Method
                        </MenuItem>
                        {methodConfigLoading ? (
                          <MenuItem value="" disabled>Loading methods...</MenuItem>
                        ) : methodConfigError ? (
                          <MenuItem value="" disabled>Error loading methods</MenuItem>
                        ) : (
                          Object.keys(methodConfigurations).map((method) => (
                            <MenuItem key={method} value={method}>
                              {method}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {selectedMethod && (
                        <Box mt={2}>
                          {hasConfigParameters(selectedMethod) && <Typography variant="subtitle2">Initialization Parameters</Typography>}
                          {Object.keys(initParams).map((paramKey) => {
                            const paramConfig = methodConfigurations[selectedMethod]?.initParams[paramKey];
                            return (
                              <TextField
                                key={paramKey}
                                label={paramConfig?.label}
                                value={initParams[paramKey]}
                                onChange={(e) => handleParamChange(paramKey, e.target.value)}
                                fullWidth
                                size="small"
                                type={paramConfig?.type === "number" ? "number" : "text"}
                                inputProps={{
                                  step: paramConfig?.step,
                                  min: paramConfig?.min,
                                  max: paramConfig?.max,
                                }}
                                sx={{ mb: 1, mt: 1 }}
                              />
                            );
                          })}
                          <Box display="flex" justifyContent="space-between">
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={handleAddInstance}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outlined"
                              color="secondary"
                              size="small"
                              onClick={handleCancelAddMethod}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Grid>
                <Grid size={12}>
                  <Typography variant="overline">Measures</Typography>
                  <Select
                    multiple
                    fullWidth
                    size="small"
                    value={measures.map((measure) => measure.name)}
                    onChange={handleSelectMeasures}
                    renderValue={(selected) => (
                      <div>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} style={{ margin: 2 }} />
                        ))}
                      </div>
                    )}
                  >
                    {metadata?.measures.map((measure: Measure) => (
                      <MenuItem key={measure.id} value={measure.name}>
                        {measure.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid size={12}>
                  {existingQueryParams() && <Typography variant="overline">Query Parameters</Typography>}
                  {selectedMethodInstances.map((instanceId) => {
                    const [method] = instanceId.split('-');
                    const params = methodConfigurations[method]?.queryParams || {};
                    if (Object.keys(params).length === 0) return null; // Skip if no query params
                    return (
                      <Box key={instanceId}>
                        <Typography variant="subtitle2">{formatInstanceId(instanceId)}</Typography>
                        {Object.keys(params).map((paramKey) => {
                          const paramConfig = params[paramKey];
                          return (
                            <TextField
                              key={paramKey}
                              label={paramConfig.label}
                              value={queryParams[instanceId]?.[paramKey] || paramConfig.default}
                              onChange={(e) => handleQueryParamChange(instanceId, paramKey, e.target.value)}
                              fullWidth
                              size="small"
                              type={paramConfig.type === "number" ? "number" : "text"}
                              inputProps={{
                                step: paramConfig.step,
                                min: paramConfig.min,
                                max: paramConfig.max,
                              }}
                              sx={{ mb: 1, mt: 1 }}
                            />
                          );
                        })}
                      </Box>
                    );
                  })}
                </Grid>
                <Grid size={12}>
                  <Typography variant="overline">Visualization Controls</Typography>
                  <Box sx={{ pl: 1, pr: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Magnifier</Typography>
                      <Box
                        component="span"
                        sx={{
                          position: 'relative',
                          display: 'inline-flex',
                          width: 46,
                          height: 24,
                          borderRadius: 24,
                          backgroundColor: magnifierEnabled ? 'primary.main' : 'grey.400',
                          cursor: 'pointer',
                          transition: 'background-color 300ms',
                          '&:before': {
                            content: '""',
                            position: 'absolute',
                            width: 20,
                            height: 20,
                            left: magnifierEnabled ? 22 : 2,
                            bottom: 2,
                            borderRadius: '50%',
                            transition: 'left 300ms',
                            backgroundColor: 'white',
                          },
                        }}
                        onClick={() => setMagnifierEnabled(!magnifierEnabled)}
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Quality Measure</Typography>
                      <Box
                          component="span"
                          sx={{
                            position: 'relative',
                            display: 'inline-flex',
                            width: 46,
                            height: 24,
                            borderRadius: 24,
                            backgroundColor: qualityMeasuresDisabled()
                              ? 'grey.300'
                              : showQualityMetrics
                              ? 'primary.main'
                              : 'grey.400',
                            cursor: qualityMeasuresDisabled() ? 'not-allowed' : 'pointer',
                            opacity: qualityMeasuresDisabled() ? 0.6 : 1,
                            transition: 'background-color 300ms',
                            '&:before': {
                              content: '""',
                              position: 'absolute',
                              width: 20,
                              height: 20,
                              left: showQualityMetrics ? 22 : 2,
                              bottom: 2,
                              borderRadius: '50%',
                              transition: 'left 300ms',
                              backgroundColor: 'white',
                            },
                          }}
                          onClick={qualityMeasuresDisabled() ? undefined : handleToggleQualityMetrics}
                        />
                    </Box>      
                    {/* Status indicators */}
                    {isCalculatingSSIM && (
                      <Box display="flex" alignItems="center" mt={1}>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Calculating quality metrics...
                        </Typography>
                      </Box>
                    )}
                    
                    {isReferenceFetching && (
                      <Box display="flex" alignItems="center" mt={1}>
                        <CircularProgress size={16} sx={{ mr: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Fetching reference data...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Main content area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: (theme) => theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Chart area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            mb: `${PADDING_BETWEEN_SECTIONS}px`, // Add padding between sections
          }}
        >
          <Card variant="outlined" sx={{ height: '100%', width: '100%' }}> {/* Add width 100% */}
            <CardContent 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: !queryResults || !measures.length || selectedMethodInstances.length === 0 ? 'center' : 'flex-start', // Center when empty
                alignItems: !queryResults || !measures.length || selectedMethodInstances.length === 0 ? 'center' : 'stretch', // Center when empty
              }}
            >
          {!queryResults || !measures.length || selectedMethodInstances.length === 0 ? (
                <Typography sx={{ color: 'text.secondary', fontSize: 14, textAlign: 'center' }}>
                  {loading ? (
                    <>
                      <CircularProgress size={'3rem'} />
                    </>
                  ) : selectedMethodInstances.length === 0 ? (
                    'Please select or create a method instance to display charts'
                  ) : !measures.length ? (
                    'Please select at least one measure to display'
                  ) : (
                    'No data available'
                  )}
                </Typography>
          ) : (
            // Render measure-by-measure, and within each measure, render each method's chart
            <Box id="chart-content" sx={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}> {/* Add container for better layout */}
              {measures.map((measure, measureIndex) => {
                // Calculate height based on available space and number of measures
                const measureHeight = `${100 / measures.length}%`;
                return (
                  <>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: 14, mt: 1 }}>
                        {measure.name}
                    </Typography>
                    <Card 
                      variant="outlined" 
                      key={`measure_${measureIndex}`} 
                      sx={{ 
                        height: measureHeight, // Dynamically set height based on number of measures
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <CardContent sx={{ 
                        paddingLeft: DEFAULT_CHART_PADDING + 'px', 
                        paddingRight: DEFAULT_CHART_PADDING + 'px', 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column'
                      }}>
                        {/* For each selected method instance, display a sub-chart for this measure */}
                        {selectedMethodInstances.map((instanceId) => {
                          const algoResult = queryResults[instanceId];
                          // If there's no data yet for that method, just show a loader or placeholder
                          if (!algoResult) {
                            return (
                              <Box
                                key={`chart_${instanceId}_${measureIndex}`}
                                height={Math.floor(height / measures.length / selectedMethodInstances.length)}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                position="relative"
                              >
                                {loadingCharts[instanceId] ? (
                                  <CircularProgress size={'3rem'} />
                                ) : (
                                  <Typography
                                    sx={{
                                      color: 'text.secondary',
                                      fontSize: 14,
                                      textAlign: 'center',
                                    }}
                                  >
                                    No data for {formatInstanceId(instanceId)}
                                  </Typography>
                                )}
                              </Box>
                            );
                          }
                          return (
                            <Box key={`chart_${instanceId}_${measureIndex}`} position="relative">
                              {/* Method label */}
                              <Typography variant="caption" sx={{ ml: 2 }}>
                                {formatInstanceId(instanceId)}
                              </Typography>
                              {/* The actual chart */}
                              <svg
                                id={`svg_${instanceId}_${measureIndex}`}
                                width={width}
                                height={Math.floor(height / measures.length / selectedMethodInstances.length)}
                              />
                              {loadingCharts[instanceId] && (
                                <Box
                                  position="absolute"
                                  top={0}
                                  left={0}
                                  width="100%"
                                  height="100%"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  bgcolor="rgba(255, 255, 255, 0.7)"
                                  zIndex={1}
                                >
                                  <CircularProgress size={'3rem'} />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </>
              )})}
            </Box>
          )}
          </CardContent>
         </Card>
        </Box>

        {/* Resizable logs panel */}
        <Resizable
          size={{ width: '100%', height: logHeight }}
          minHeight={MIN_LOG_HEIGHT}
          maxHeight={MAX_LOG_HEIGHT}
          enable={{ top: true }}
          onResizeStop={(e, direction, ref, d) => {
            setLogHeight(logHeight + d.height);
          }}
          handleComponent={{
            top: (
              <div
                style={{
                  position: 'relative',
                  top: `${-PADDING_BETWEEN_SECTIONS / 2 + 1}px`,
                  width: '100%',
                  height: '8px',
                  cursor: 'row-resize',
                }}
              >
                {/* Top line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    // borderTop: '1px solid #ccc',
                  }}
                />
                
                {/* Bottom line */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    // borderTop: '1px solid #ccc',
                  }}
                />
                
                {/* The “grip” in the middle */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '30px',
                    height: '4px',
                    backgroundColor: '#999',
                    borderRadius: '2px',
                  }}
                />
              </div>
            ),
          }}
          style={{
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <Card
            variant="outlined"
            sx={{
              height: "100%", // Use 100% of the available space
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <CardContent sx={{ p: 2, pb: 1 }}> {/* Reduce bottom padding */}
              <Box
                display="flex"
                flexDirection={'row'}
                flexWrap={'nowrap'}
                alignItems={'center'}
                justifyContent={'space-between'}
              >
                <Typography variant="subtitle1" fontWeight="medium">Query History</Typography>
                
                <Box display="flex" gap={2}>
                  {/* Toggle between table and chart view */}
                  <ToggleButtonGroup
                    size="small"
                    value={logViewMode}
                    exclusive
                    onChange={handleLogViewModeChange}
                    aria-label="log view mode"
                  >
                    <ToggleButton value="table" aria-label="table view">
                      <TableViewIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="chart" aria-label="chart view">
                      <BarChartIcon fontSize="small" />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  
                  {/* Toggle between latest, recent, or all queries */}
                  <ToggleButtonGroup
                    size="small"
                    value={logViewTimeframe}
                    exclusive
                    onChange={handleLogTimeframeChange}
                    aria-label="log timeframe"
                  >
                    <ToggleButton value="latest" aria-label="latest query">
                      <Typography variant="caption">Latest</Typography>
                    </ToggleButton>
                    <ToggleButton value="recent" aria-label="recent queries">
                      <Typography variant="caption">Recent</Typography>
                    </ToggleButton>
                    <ToggleButton value="all" aria-label="all queries">
                      <Typography variant="caption">All</Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>

                  <IconButton
                    color="inherit"
                    onClick={handleExportResults}
                    title="Export session results"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden', px: 2, pb: 2 }}> {/* Add horizontal padding */}
              {logViewMode === 'table' ? renderLogsTable() : renderLogsCharts()}
            </Box>
          </Card>
        </Resizable>

        {/* Magnifying lens element - only show if enabled */}
        {magnifierVisible && magnifierEnabled && (
          <div 
            ref={magnifierRef}
            style={{
              position: 'fixed',
              left: magnifierPosition.x - MAGNIFIER_SIZE/2,
              top: magnifierPosition.y - MAGNIFIER_SIZE/2,
              width: MAGNIFIER_SIZE,
              height: MAGNIFIER_SIZE,
              pointerEvents: 'none',
              zIndex: 9999,
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid white',
            }}
          >
            {renderMagnifiedContent()}
          </div>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;
