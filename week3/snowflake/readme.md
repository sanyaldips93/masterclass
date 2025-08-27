# Snowflake API Demo

Minimal Node.js project with MySQL:

- **table_node** → IDs generated with Node.js Snowflake (16-bit)
- **table_db** → IDs generated with MySQL stored procedure

## Setup and Run
npm install
npm start


## Insert with Node.js Snowflake
curl -X POST http://localhost:3000/insert-node \
     -H "Content-Type: application/json" \
     -d '{"value":"hello"}'


## Insert with DB Stored Procedure
curl -X POST http://localhost:3000/insert-db \
     -H "Content-Type: application/json" \
     -d '{"value":"world"}'
