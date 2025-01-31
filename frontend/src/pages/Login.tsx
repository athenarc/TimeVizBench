import { LockOutlined } from "@mui/icons-material";
import {
  Container,
  CssBaseline,
  Box,
  Avatar,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import { Navigate } from 'react-router-dom';
import apiService from "api/apiService";
import { enqueueSnackbar } from "notistack";
import { useState, useEffect } from "react";
import { useCookies } from 'react-cookie';

const Login = () => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [cookies, setCookie] = useCookies(['jwt']);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true)
    try {
      const response = await apiService.login({ username, password });
      setCookie('jwt', response.data.token);
      enqueueSnackbar(response.data.msg, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Invalid credentials", { variant: "error" });
      console.error("Error logging in:", error);
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    const autoLogin = async () => {
      if (!cookies.jwt) {
        setLoading(true);
        try {
          const response = await apiService.login({ 
            username: "admin", 
            password: "password" 
          });
          setCookie('jwt', response.data.token);
          enqueueSnackbar("Auto-login successful", { variant: "success" });
        } catch (error) {
          console.error("Auto-login failed:", error);
          enqueueSnackbar("Auto-login failed", { variant: "error" });
        } finally {
          setLoading(false);
        }
      }
    };

    autoLogin();
  }, [cookies.jwt, setCookie]);

  return (
    <>
      {cookies.jwt && (
        <Navigate to="/" replace={true} />
      )}
      <Container maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            mt: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "primary.light" }}>
            <LockOutlined />
          </Avatar>
          <Typography variant="h5">Login</Typography>
          <form onSubmit={handleLogin}>
            <Box sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />

              <Button
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2 }}
                type="submit"
              >
                Login
              </Button>
            </Box>
          </form>
        </Box>
      </Container>
    </>
  );
};

export default Login;
