# project structure
mysql-bench/
├─ package.json
├─ index.js        # only 2 routes
├─ dbOps.js        # non-index ops
├─ indexer.js      # index ops
├─ logger.js       # logging
└─ benchmark_results.txt


# mysql-bench
1. Install
   npm install

2. NOTE about DB URI
   Your URI: mysql://root:pass@123@localhost:3306/local
   If the password contains '@' (or other reserved chars), URL-encode them. Example:
   password 'pass@123' -> 'pass%40123'
   So URI becomes:
   mysql://root:pass%40123@localhost:3306/local

   Alternatively, replace DB_URI in index.js with an object config:
   { host:'localhost', user:'root', password:'pass@123', database:'local', port:3306 }

3. Start
   npm start

4. Run benchmark
   Open: http://localhost:3000/benchmark/no-index
   Open: http://localhost:3000/benchmark/indexed

5. Output
   All timings and index sizes append to `benchmark_results.txt` in the project root.

Config:
- TOTAL_ROWS = 1_000_000
- BATCH_SIZE = 5000
- SELECTS_COUNT = 1000
