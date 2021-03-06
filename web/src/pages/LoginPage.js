import React, { useContext } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { Formik } from 'formik';
import {
  Box,
  Button,
  Container,
  Link,
  TextField,
  Typography,
  makeStyles
} from '@material-ui/core';
import Page from 'src/components/Page';
import { UserContext } from 'src/UserContext';
import { fetchLoginInfo } from 'src/calls/loginCalls'
import { useToasts } from 'react-toast-notifications'

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.dark,
    height: '100%',
    paddingBottom: theme.spacing(3),
    paddingTop: theme.spacing(3)
  }
}));

const LoginPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { context, setContext } = useContext(UserContext)
  const { addToast } = useToasts()

  const handleFormSubmit = async (values) => {
    console.log(values)
    let resp = await fetchLoginInfo(values);
        if (resp.data.success === true) {
            localStorage.setItem('username', values.username);
            localStorage.setItem('isLoggedIn', true);
            localStorage.setItem('isAdmin', resp.data.isAdmin);
            setContext({ 
                ...context, 
                username: localStorage.getItem('username'),
                isLoggedIn: localStorage.getItem('isLoggedIn'),
                isAdmin: localStorage.getItem('isAdmin'),
            });
            if (resp.data.isAdmin) {
              navigate('/app/admin', { replace: true });
            } else {
              navigate('/app/pets', { replace: true });
            }
            addToast("Login Successful", {
              appearance: 'success',
              autoDismiss: true,
            })
        } else {
            addToast("Account does not exist! Please sign up for an account.", {
              appearance: 'error',
              autoDismiss: true,
            })
        }
  }

  return (
    <Page
      className={classes.root}
      title="Login"
    >
      <Box
        display="flex"
        flexDirection="column"
        height="100%"
        justifyContent="center"
      >
        <Container maxWidth="sm">
          <Formik
            initialValues={{
              username: "",
              password: "",
            }}
            validationSchema={Yup.object().shape({
              username: Yup.string().max(255).required('Must be a valid username'),
              password: Yup.string().max(255).required('Password is required')
            })}
            onSubmit={(values) => {
              handleFormSubmit(values)
            }}
          >
            {({
              errors,
              handleBlur,
              handleChange,
              handleSubmit,
              touched,
              values
            }) => (
              <form onSubmit={handleSubmit}>
                <Box mb={3}>
                  <Typography
                    color="textPrimary"
                    variant="h2"
                  >
                    Sign in
                  </Typography>
                  <Typography
                    color="textSecondary"
                    gutterBottom
                    variant="body2"
                  >
                    Sign in on the internal platform
                  </Typography>
                </Box>
                <TextField
                  error={Boolean(touched.username && errors.username)}
                  fullWidth
                  helperText={touched.username && errors.username}
                  label="Username"
                  margin="normal"
                  name="username"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  type="Username"
                  variant="outlined"
                  value={values.username}
                />
                <TextField
                  error={Boolean(touched.password && errors.password)}
                  fullWidth
                  helperText={touched.password && errors.password}
                  label="Password"
                  margin="normal"
                  name="password"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  type="password"
                  variant="outlined"
                  value={values.password}
                />
                <Box my={2}>
                  <Button
                    color="primary"
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                  >
                    Sign in now
                  </Button>
                </Box>
                <Typography
                  color="textSecondary"
                  variant="body1"
                >
                  Don&apos;t have an account?
                  {' '}
                  <Link
                    component={RouterLink}
                    to="/register"
                    variant="h6"
                  >
                    Sign up
                  </Link>
                </Typography>
              </form>
            )}
          </Formik>
        </Container>
      </Box>
    </Page>
  );
};

export default LoginPage;
