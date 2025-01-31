# TimeVizBench

## Instructions for Local Environment
1. Start the backend service by running in the backend project root `java -jar target/min-max-cache-2.0.jar`
2. Start the frontend service by running in the frontend project root `npm start`
3. Spin up nginx by running `docker compose up -d`
4. The page will page available on `http://localhost:9090`

### Deployment instructions (using Docker)
1. Copy .env.example -> .env
  ```shell
  cp .env.example .env
  ```
2. Copy `dev.conf.template` -> `default.conf.template`
  ```shell
  cp dev.conf.template default.conf.template
  ```
3. Build the front end
  ```shell
  npm run build
  ```
4. Start the container
  ```shell
  docker compose up -d
  ```
