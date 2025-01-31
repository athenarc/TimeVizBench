import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { elGR } from '@mui/x-date-pickers/locales';
import 'dayjs/locale/el';

const ProtectedRoute = () => {
  return (
    <Box>
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="el"
        localeText={elGR.components.MuiLocalizationProvider.defaultProps.localeText}
      >
        <Outlet />
      </LocalizationProvider>
    </Box>
  );
};

export default ProtectedRoute;
