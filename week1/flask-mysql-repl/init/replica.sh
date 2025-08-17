#!/bin/bash

echo "Waiting for master to be ready..."
sleep 5
until mysql -h mysql-master -uroot -proot -e "SELECT 1" >/dev/null 2>&1; do
  echo "Master not ready yet..."
  sleep 5
done

echo "Dumping schema from master..."
mysqldump -h mysql-master -uroot -proot --no-data usersdb | mysql -uroot -proot usersdb

echo "Configuring replication..."
mysql -uroot -proot <<EOF
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-master',
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass',
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=4,
  SOURCE_DELAY=5;
START REPLICA;
EOF

echo "Replica configured with schema!"
