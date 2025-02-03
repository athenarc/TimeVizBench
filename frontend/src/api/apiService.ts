import { services as authenticationServices } from "./auth";
import { services as dataServices } from "./data";
import { services as methodConfigServices } from "./methodConfig";

// Define functions to call the endpoints
const apiService = {
  ...authenticationServices,
  ...dataServices,
  ...methodConfigServices,
};

export default apiService;
