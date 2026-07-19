import { createTheme } from '@mui/material/styles';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4f46e5',
    },
    secondary: {
      main: '#db2777',
    },
    background: {
      default: '#f6f7fb',
      paper: '#ffffff',
    },
    success: {
      main: '#15803d',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h3: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #e5e7eb',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.07)',
        },
      },
    },
  },
});