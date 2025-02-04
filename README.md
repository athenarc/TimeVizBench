# TimeVizBench
## An interactive evaluation platform for scalable time series visualization methods across performance and accuracy dimensions.

## Prerequisites
- Java 17
- Maven
- Node.js
- Docker & Docker Compose

---

## Getting the Code

1. Clone the Repository 
    ```bash
    git clone https://github.com/athenarc/TimeVizBench.git
    ```
2. Navigate into the repository:
 bash
 cd TimeVizBench
 

---

## Local Development

### 1. Build the Backend
- Go to the backend directory:
  ```bash
    cd backend
  ```

- Run Maven to package the Spring Boot application:
  ``` bash
  mvn clean install
  ```
- A .jar file (e.g., time-viz-bench-1.0.jar) will appear in the target directory.

### 2. Start the Spring Boot Backend
```bash
java -jar target/time-viz-bench-1.0.jar
```
The backend will now run and wait for requests.

### 3. Install and Start the Frontend
- Navigate to the frontend directory:
  ```bash
  cd ../frontend
  ```
- Install dependencies (if not already done):
  ```bash
  npm install
  ```
- Start the development server:
  ```bash
  npm start
  ```

### 4. Run NGINX via Docker
In a new terminal, from the frontend folder, run:
```bash
docker compose up -d
```
This spins up an NGINX container configured to serve the application.

### 5. Access the Application
Open your browser at:

http://localhost:9090

The frontend should communicate with the locally running backend.

---

## Deployment (Using Docker)

### 1. Build and run the Backend
From the project root, navigate to backend:
```bash
cd backend
mvn clean install
java -jar target/time-viz-bench-1.0.jar
```

### 2. Prepare the Frontend
Go to the frontend folder from the project root:
```bash
cd frontend
```

### 3. Copy Environment and Configuration TemplatesInside the frontend folder, you’ll see the .env.example file and a templates directory:
```bash
cp .env.example .env
cp templates/dev.conf.template templates/default.conf.template
```
This sets up your environment variables and the development NGINX config.

### 4. Build the Frontend for Production
```bash
npm run build
```
This compiles the frontend into production-ready static files.

### 5. Start Containers with Docker Compose
Still in the frontend directory (where your docker-compose.yml resides), run:
```bash
docker compose up -d
```
This will launch the backend container (using the .jar built in step 1) and the NGINX container (to serve the newly built frontend).

### 6. Verify the Deployment
Visit:

http://localhost:9090

You should see the application running in its containerized form (backend + frontend via NGINX).

## Creating a Visual Method

TimeVizBench automatically discovers and registers visual methods. Once implemented, they become available in the UI with auto-generated parameter controls.

### 1. Create a New Method Class 
```java
@VisualMethod(
    name = "ExampleAverage",
    description = "An example method that computes averages over time intervals"
)
public class SimpleAverageMethod implements Method {
    
    // Parameters automatically appear as UI controls
    // This is a query parameter that decides the agg. interval
    @Parameter(
       name = "Interval (ms)",
        description = "The aggregation interval in milliseconds",
        min = 1000,
        max = 12000000000L,
        step = 10000,
        defaultValue = 10000, 
        isQueryParameter = true
    )
    private long interval;
}
```

### 2. Implement Required Methods
The method interface requires two main methods:

```java
// Handles method initialization
@Override
public void initialize(String schema, String datasetId, 
                      DatasourceConnector datasourceConnector, 
                      Map<String, String> params) {
    // Validation and setup logic
}

// Processes visualization queries
@Override
public VisualQueryResults executeQuery(VisualQuery query) {
    // Query processing logic
}
```

### 3. Ready to Use
- Place your implementation in the methods package
- The system automatically:
  - Discovers the method via @VisualMethod annotation
  - Creates UI controls based on @Parameter annotations
  - Makes the method available in the visualization interface
  - Handles parameter validation and query execution

See `SimpleAverageMethod.java` for a complete reference implementation.
