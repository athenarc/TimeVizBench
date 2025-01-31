import { services as authenticationServices } from "./auth";
import { services as dataServices } from "./data";

// Define functions to call the endpoints
const apiService = {
  ...authenticationServices,
  ...dataServices,
};

export default apiService;
